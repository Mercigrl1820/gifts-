import { Redis } from "@upstash/redis";
import type { SearchLimitStore } from "@/lib/search-limit";
import { readRedisCredentials } from "@/lib/redis-env";

const UNLIMITED_PREFIX = "gift:unlimited:";
const PURCHASE_PREFIX = "gift:purchase:";

/**
 * Null when Redis credentials are missing. Callers fail open so production
 * keeps serving searches before the Marketplace integration is connected.
 * The client is created per call and does not connect until a command runs.
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
    return value === "unlock" || value === "purchase";
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
}
