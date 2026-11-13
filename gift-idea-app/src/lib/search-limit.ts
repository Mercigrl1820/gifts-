import type { VisitorCookie } from "@/lib/visitor-cookie";
import { hmacSha256, resolveVisitor } from "@/lib/visitor-cookie";
import {
  VISITOR_COOKIE_SECRET_ENV,
  type SearchLimitConfig,
} from "@/lib/search-limit-config";
import { redisSetupWarning } from "@/lib/redis-env";
import { warnOnce } from "@/lib/warn-once";

/**
 * Search allowance stored in Upstash Redis.
 * When Redis or the cookie secret is missing, enforceSearchLimit allows the
 * request and logs a warning so a deploy before setup does not take the site down.
 */
export interface SearchLimitStore {
  isUnlimited(visitorId: string): Promise<boolean>;
  grantUnlimited(visitorId: string, source: "unlock" | "purchase"): Promise<void>;
  increment(key: string, ttlSeconds: number | null): Promise<number>;
  claimPurchaseEvent(sessionId: string): Promise<boolean>;
}

/** Dated counters expire after three days. A "never" visitor counter has no TTL. */
export const SEARCH_COUNTER_TTL_SECONDS = 3 * 24 * 60 * 60;

export type SearchLimitDecision = {
  allowed: boolean;
  limit: number;
  cookie: VisitorCookie | null;
  reason: "visitor" | "ip" | null;
};

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function visitorCountKey(visitorId: string, reset: "never" | "daily", day: string): string {
  return reset === "daily" ? `gift:count:${visitorId}:${day}` : `gift:count:${visitorId}`;
}

export function ipCountKey(ipHash: string, day: string): string {
  return `gift:ip:${ipHash}:${day}`;
}

export async function hashClientIp(ip: string, secret: string): Promise<string> {
  const digest = await hmacSha256(secret, `ip:${ip}`);
  return digest.slice(0, 32);
}

export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 200);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 200);
  }
  return "unknown";
}

export async function enforceSearchLimit(input: {
  store: SearchLimitStore | null;
  config: SearchLimitConfig;
  cookieHeader: string | null;
  ip: string;
  isLoadMore: boolean;
  now?: Date;
}): Promise<SearchLimitDecision> {
  const limit = input.config.limit;
  const allow = (cookie: VisitorCookie | null): SearchLimitDecision => ({
    allowed: true,
    limit,
    cookie,
    reason: null,
  });

  if (!input.config.cookieSecret) {
    warnOnce(
      `[search-limit] ${VISITOR_COOKIE_SECRET_ENV} is missing or shorter than 16 characters. Allowing searches.`,
    );
    return allow(null);
  }

  const cookie = await resolveVisitor(input.cookieHeader, input.config.cookieSecret);

  if (!input.store) {
    warnOnce(redisSetupWarning());
    return allow(cookie);
  }

  try {
    if (await input.store.isUnlimited(cookie.visitorId)) {
      return allow(cookie);
    }

    const now = input.now ?? new Date();
    const day = utcDay(now);
    const countVisitor = !input.isLoadMore || input.config.countLoadMore;

    // Reserve the visitor's search before any model call. A denied attempt does
    // not also consume the daily network cap, so repeat clicks stay cheap.
    if (countVisitor) {
      const visitorKey = visitorCountKey(cookie.visitorId, input.config.reset, day);
      const visitorTtl = input.config.reset === "daily" ? SEARCH_COUNTER_TTL_SECONDS : null;
      const visitorCount = await input.store.increment(visitorKey, visitorTtl);
      if (visitorCount > limit) {
        return { allowed: false, limit, cookie, reason: "visitor" };
      }
    }

    const ipHash = await hashClientIp(input.ip, input.config.cookieSecret);
    const ipCount = await input.store.increment(ipCountKey(ipHash, day), SEARCH_COUNTER_TTL_SECONDS);
    if (ipCount > input.config.ipDailyCap) {
      return { allowed: false, limit, cookie, reason: "ip" };
    }

    return allow(cookie);
  } catch {
    warnOnce("[search-limit] Could not update the search counter. Allowing this search.");
    return allow(cookie);
  }
}
