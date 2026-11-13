import { Redis } from "@upstash/redis";
import type { SearchLimitStore } from "@/lib/search-limit";
import { readRedisCredentials } from "@/lib/redis-env";
import { isVisitorId } from "@/lib/public-visitor-id";
import {
  CUSTOMER_ID_PATTERN,
  coerceSubscriptionSnapshot,
  subscriptionGrantsAccess,
  type SubscriptionSnapshot,
} from "@/lib/subscription-access";

const UNLIMITED_PREFIX = "gift:unlimited:";
const PURCHASE_PREFIX = "gift:purchase:";
const CUSTOMER_PREFIX = "gift:billing-customer:";
const VISITOR_BY_CUSTOMER_PREFIX = "gift:billing-visitor:";
const SUBSCRIPTION_PREFIX = "gift:subscription:";

/**
 * Null when Redis credentials are missing. Callers fail closed so a search
 * cannot run without the counter. The client is created per call and does
 * not connect until a command runs.
 */
export function createSearchLimitStore(
  env: Record<string, string | undefined> = process.env,
): SearchLimitStore | null {
  const credentials = readRedisCredentials(env);
  if (!credentials) return null;
  return new UpstashSearchLimitStore(new Redis({ url: credentials.url, token: credentials.token }));
}

class UpstashSearchLimitStore implements SearchLimitStore {
  constructor(private readonly redis: Redis) {}

  async isUnlimited(visitorId: string): Promise<boolean> {
    const value = await this.redis.get<string>(`${UNLIMITED_PREFIX}${visitorId}`);
    if (value === "unlock" || value === "purchase") return true;
    const subscription = await this.readSubscription(visitorId);
    if (!subscription) return false;
    return subscriptionGrantsAccess(subscription, Math.floor(Date.now() / 1000));
  }

  async grantUnlimited(visitorId: string, source: "unlock" | "purchase"): Promise<void> {
    await this.redis.set(`${UNLIMITED_PREFIX}${visitorId}`, source);
  }

  async increment(key: string, ttlSeconds: number | null): Promise<number> {
    const count = Number(await this.redis.incr(key));
    if (!Number.isFinite(count)) {
      throw new Error("Search counter was not a number");
    }
    if (ttlSeconds !== null && count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  async claimPurchaseEvent(sessionId: string): Promise<boolean> {
    if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return false;
    const result = await this.redis.set(`${PURCHASE_PREFIX}${sessionId}`, "1", { nx: true });
    return result === "OK";
  }

  async saveBillingCustomer(visitorId: string, customerId: string): Promise<void> {
    if (!isVisitorId(visitorId) || !CUSTOMER_ID_PATTERN.test(customerId)) return;
    await this.redis.set(`${CUSTOMER_PREFIX}${visitorId}`, customerId);
    await this.redis.set(`${VISITOR_BY_CUSTOMER_PREFIX}${customerId}`, visitorId);
  }

  async readBillingCustomer(visitorId: string): Promise<string | null> {
    if (!isVisitorId(visitorId)) return null;
    const value = await this.redis.get<string>(`${CUSTOMER_PREFIX}${visitorId}`);
    return typeof value === "string" && CUSTOMER_ID_PATTERN.test(value) ? value : null;
  }

  async readVisitorByCustomer(customerId: string): Promise<string | null> {
    if (!CUSTOMER_ID_PATTERN.test(customerId)) return null;
    const value = await this.redis.get<string>(`${VISITOR_BY_CUSTOMER_PREFIX}${customerId}`);
    return typeof value === "string" && isVisitorId(value) ? value : null;
  }

  async saveSubscription(visitorId: string, snapshot: SubscriptionSnapshot): Promise<void> {
    if (!isVisitorId(visitorId)) return;
    const stored = coerceSubscriptionSnapshot(snapshot);
    if (!stored) return;
    await this.redis.set(`${SUBSCRIPTION_PREFIX}${visitorId}`, JSON.stringify(stored));
  }

  async readSubscription(visitorId: string): Promise<SubscriptionSnapshot | null> {
    if (!isVisitorId(visitorId)) return null;
    const value = await this.redis.get<unknown>(`${SUBSCRIPTION_PREFIX}${visitorId}`);
    return coerceSubscriptionSnapshot(value);
  }
}
