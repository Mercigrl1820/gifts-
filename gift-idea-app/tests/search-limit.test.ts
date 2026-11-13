/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freeSearchLimitMessage } from "../src/lib/free-search-message";
import {
  KV_REST_API_TOKEN_ENV,
  KV_REST_API_URL_ENV,
  readRedisCredentials,
  UPSTASH_REDIS_REST_TOKEN_ENV,
  UPSTASH_REDIS_REST_URL_ENV,
} from "../src/lib/redis-env";
import {
  enforceSearchLimit,
  hashClientIp,
  ipCountKey,
  utcDay,
  visitorCountKey,
} from "../src/lib/search-limit";
import {
  DEFAULT_FREE_SEARCH_LIMIT,
  DEFAULT_IP_DAILY_CAP,
  readSearchLimitConfig,
  VISITOR_COOKIE_SECRET_ENV,
} from "../src/lib/search-limit-config";
import { createSearchLimitStore } from "../src/lib/search-limit-store";
import { signVisitorCookie, verifyVisitorCookie } from "../src/lib/visitor-cookie";
import { resetWarnings } from "../src/lib/warn-once";
import { memorySearchStore } from "./memory-search-store";

const SECRET = "test-cookie-secret-value";
const DAY = new Date("2026-11-13T15:00:00.000Z");
const NEXT_DAY = new Date("2026-11-14T15:00:00.000Z");

function config(overrides: Partial<ReturnType<typeof readSearchLimitConfig>> = {}) {
  return {
    limit: DEFAULT_FREE_SEARCH_LIMIT,
    reset: "never" as const,
    ipDailyCap: DEFAULT_IP_DAILY_CAP,
    countLoadMore: false,
    cookieSecret: SECRET,
    ...overrides,
  };
}

function cookieHeader(value: string) {
  return `gift_visitor=${encodeURIComponent(value)}`;
}

describe("search limit config and Redis env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetWarnings();
  });

  it("uses the documented defaults", () => {
    expect(readSearchLimitConfig({})).toEqual({
      limit: 2,
      reset: "never",
      ipDailyCap: 20,
      countLoadMore: false,
      cookieSecret: null,
    });
    expect(freeSearchLimitMessage(2)).toBe("You've used your 2 free searches.");
    expect(freeSearchLimitMessage(1)).toBe("You've used your 1 free search.");
  });

  it("reads supported overrides and ignores a short cookie secret", () => {
    expect(
      readSearchLimitConfig({
        FREE_SEARCH_LIMIT: "4",
        FREE_SEARCH_RESET: "daily",
        FREE_SEARCH_IP_DAILY_CAP: "6",
        FREE_SEARCH_COUNT_LOAD_MORE: "true",
        [VISITOR_COOKIE_SECRET_ENV]: "short",
      }),
    ).toMatchObject({
      limit: 4,
      reset: "daily",
      ipDailyCap: 6,
      countLoadMore: true,
      cookieSecret: null,
    });
  });

  it("accepts either Upstash Marketplace env pair and does not open a connection", () => {
    expect(
      readRedisCredentials({
        [UPSTASH_REDIS_REST_URL_ENV]: " https://upstash.example ",
        [UPSTASH_REDIS_REST_TOKEN_ENV]: " upstash-token ",
        [KV_REST_API_URL_ENV]: "https://kv.example",
        [KV_REST_API_TOKEN_ENV]: "kv-token",
      }),
    ).toEqual({ url: "https://upstash.example", token: "upstash-token" });

    expect(
      readRedisCredentials({
        [KV_REST_API_URL_ENV]: "https://kv.example",
        [KV_REST_API_TOKEN_ENV]: "kv-token",
      }),
    ).toEqual({ url: "https://kv.example", token: "kv-token" });

    expect(readRedisCredentials({ [UPSTASH_REDIS_REST_URL_ENV]: "https://upstash.example" })).toBeNull();
    expect(createSearchLimitStore({})).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("enforceSearchLimit", () => {
  beforeEach(() => {
    resetWarnings();
  });

  it("allows two searches, then refuses without counting a denied click against the network cap", async () => {
    const memory = memorySearchStore();
    const first = await enforceSearchLimit({
      store: memory.store,
      config: config(),
      cookieHeader: null,
      ip: "203.0.113.10",
      isLoadMore: false,
      now: DAY,
    });
    expect(first.allowed).toBe(true);
    expect(first.cookie).not.toBeNull();

    const header = cookieHeader(first.cookie!.value);
    const second = await enforceSearchLimit({
      store: memory.store,
      config: config(),
      cookieHeader: header,
      ip: "203.0.113.10",
      isLoadMore: false,
      now: DAY,
    });
    expect(second.allowed).toBe(true);
    expect(second.cookie?.visitorId).toBe(first.cookie!.visitorId);

    const third = await enforceSearchLimit({
      store: memory.store,
      config: config(),
      cookieHeader: header,
      ip: "203.0.113.10",
      isLoadMore: false,
      now: DAY,
    });
    expect(third).toMatchObject({ allowed: false, limit: 2, reason: "visitor" });

    const visitorKey = visitorCountKey(first.cookie!.visitorId, "never", utcDay(DAY));
    expect(memory.counts.get(visitorKey)).toBe(3);
    const ipHash = await hashClientIp("203.0.113.10", SECRET);
    expect(memory.counts.get(ipCountKey(ipHash, utcDay(DAY)))).toBe(2);
  });

  it("does not count Load more unless the flag is on, and still applies the daily network cap", async () => {
    const memory = memorySearchStore();
    const settings = config({ limit: 1, ipDailyCap: 3 });
    const first = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: null,
      ip: "203.0.113.11",
      isLoadMore: false,
      now: DAY,
    });
    const header = cookieHeader(first.cookie!.value);
    const blocked = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: header,
      ip: "203.0.113.11",
      isLoadMore: false,
      now: DAY,
    });
    expect(blocked.allowed).toBe(false);

    const visitorKey = visitorCountKey(first.cookie!.visitorId, "never", utcDay(DAY));
    const beforeLoadMore = memory.counts.get(visitorKey);
    const loadMore = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: header,
      ip: "203.0.113.11",
      isLoadMore: true,
      now: DAY,
    });
    expect(loadMore.allowed).toBe(true);
    expect(memory.counts.get(visitorKey)).toBe(beforeLoadMore);

    const counted = await enforceSearchLimit({
      store: memory.store,
      config: config({ limit: 1, ipDailyCap: 3, countLoadMore: true }),
      cookieHeader: header,
      ip: "203.0.113.11",
      isLoadMore: true,
      now: DAY,
    });
    expect(counted.allowed).toBe(false);
    expect(counted.reason).toBe("visitor");
  });

  it("resets a daily allowance on the next UTC day and keeps a never allowance", async () => {
    const daily = memorySearchStore();
    const dailyConfig = config({ limit: 1, reset: "daily" });
    const first = await enforceSearchLimit({
      store: daily.store,
      config: dailyConfig,
      cookieHeader: null,
      ip: "203.0.113.12",
      isLoadMore: false,
      now: DAY,
    });
    const header = cookieHeader(first.cookie!.value);
    expect(
      (
        await enforceSearchLimit({
          store: daily.store,
          config: dailyConfig,
          cookieHeader: header,
          ip: "203.0.113.12",
          isLoadMore: false,
          now: DAY,
        })
      ).allowed,
    ).toBe(false);
    expect(
      (
        await enforceSearchLimit({
          store: daily.store,
          config: dailyConfig,
          cookieHeader: header,
          ip: "203.0.113.12",
          isLoadMore: false,
          now: NEXT_DAY,
        })
      ).allowed,
    ).toBe(true);

    const forever = memorySearchStore();
    const opened = await enforceSearchLimit({
      store: forever.store,
      config: config({ limit: 1, reset: "never" }),
      cookieHeader: null,
      ip: "198.51.100.8",
      isLoadMore: false,
      now: DAY,
    });
    expect(
      (
        await enforceSearchLimit({
          store: forever.store,
          config: config({ limit: 1, reset: "never" }),
          cookieHeader: cookieHeader(opened.cookie!.value),
          ip: "198.51.100.8",
          isLoadMore: false,
          now: NEXT_DAY,
        })
      ).allowed,
    ).toBe(false);
  });

  it("lets an unlock or purchase skip the counter, and blocks a fresh cookie on a capped network", async () => {
    const memory = memorySearchStore();
    const settings = config({ limit: 1, ipDailyCap: 1 });
    const first = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: null,
      ip: "203.0.113.20",
      isLoadMore: false,
      now: DAY,
    });
    await memory.store.grantUnlimited(first.cookie!.visitorId, "unlock");
    const unlocked = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: cookieHeader(first.cookie!.value),
      ip: "203.0.113.20",
      isLoadMore: false,
      now: DAY,
    });
    expect(unlocked.allowed).toBe(true);
    expect(memory.counts.get(visitorCountKey(first.cookie!.visitorId, "never", utcDay(DAY)))).toBe(1);

    const fresh = await enforceSearchLimit({
      store: memory.store,
      config: settings,
      cookieHeader: null,
      ip: "203.0.113.20",
      isLoadMore: false,
      now: DAY,
    });
    expect(fresh.allowed).toBe(false);
    expect(fresh.reason).toBe("ip");
    expect(fresh.cookie?.visitorId).not.toBe(first.cookie!.visitorId);
  });

  it("rejects a tampered cookie and fails closed when the secret, store, or Redis call is missing", async () => {
    const memory = memorySearchStore();
    const realId = crypto.randomUUID();
    const signed = await signVisitorCookie(realId, SECRET);
    expect(await verifyVisitorCookie(signed, SECRET)).toBe(realId);
    expect(await verifyVisitorCookie(signed, "another-cookie-secret")).toBeNull();

    const otherId = crypto.randomUUID();
    const tampered = signed.replace(realId, otherId);
    const decision = await enforceSearchLimit({
      store: memory.store,
      config: config(),
      cookieHeader: cookieHeader(tampered),
      ip: "203.0.113.30",
      isLoadMore: false,
      now: DAY,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.cookie?.visitorId).not.toBe(realId);
    expect(decision.cookie?.visitorId).not.toBe(otherId);
    expect(memory.counts.has(visitorCountKey(realId, "never", utcDay(DAY)))).toBe(false);

    const ip = await hashClientIp("203.0.113.30", SECRET);
    expect(ip).not.toContain("203.0.113.30");
    expect(await hashClientIp("203.0.113.30", SECRET)).toBe(ip);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const missingSecret = await enforceSearchLimit({
      store: memory.store,
      config: config({ cookieSecret: null }),
      cookieHeader: null,
      ip: "203.0.113.30",
      isLoadMore: false,
      now: DAY,
    });
    expect(missingSecret).toMatchObject({ allowed: false, cookie: null, reason: "unavailable" });

    const missingStore = await enforceSearchLimit({
      store: null,
      config: config(),
      cookieHeader: null,
      ip: "203.0.113.30",
      isLoadMore: false,
      now: DAY,
    });
    expect(missingStore.allowed).toBe(false);
    expect(missingStore.reason).toBe("unavailable");
    expect(missingStore.cookie?.visitorId).toBeTruthy();

    memory.setFail(true);
    const down = await enforceSearchLimit({
      store: memory.store,
      config: config(),
      cookieHeader: cookieHeader(signed),
      ip: "203.0.113.30",
      isLoadMore: false,
      now: DAY,
    });
    expect(down.allowed).toBe(false);
    expect(down.reason).toBe("unavailable");
    expect(down.cookie?.visitorId).toBe(realId);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/Blocking searches/);
    expect(warn.mock.calls.flat().join(" ")).toMatch(/Blocking this search/);
    warn.mockRestore();
  });
});
