import { warnOnce } from "@/lib/warn-once";

export const FREE_SEARCH_LIMIT_ENV = "FREE_SEARCH_LIMIT";
export const FREE_SEARCH_RESET_ENV = "FREE_SEARCH_RESET";
export const FREE_SEARCH_IP_DAILY_CAP_ENV = "FREE_SEARCH_IP_DAILY_CAP";
export const FREE_SEARCH_COUNT_LOAD_MORE_ENV = "FREE_SEARCH_COUNT_LOAD_MORE";
export const VISITOR_COOKIE_SECRET_ENV = "GIFT_VISITOR_COOKIE_SECRET";

export const DEFAULT_FREE_SEARCH_LIMIT = 2;
export const DEFAULT_IP_DAILY_CAP = 20;
export const MIN_COOKIE_SECRET_LENGTH = 16;

const TRUE_FLAGS = new Set(["1", "true", "yes", "on"]);
const FALSE_FLAGS = new Set(["0", "false", "no", "off"]);

export type SearchLimitConfig = {
  limit: number;
  reset: "never" | "daily";
  ipDailyCap: number;
  countLoadMore: boolean;
  cookieSecret: string | null;
};

function parsePositiveInt(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return fallback;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > max) return fallback;
  return value;
}

function parseFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = raw.trim().toLowerCase();
  if (TRUE_FLAGS.has(value)) return true;
  if (FALSE_FLAGS.has(value)) return false;
  return fallback;
}

export function readSearchLimitConfig(
  env: Record<string, string | undefined> = process.env,
): SearchLimitConfig {
  const resetRaw = env[FREE_SEARCH_RESET_ENV]?.trim().toLowerCase() ?? "";
  let reset: "never" | "daily" = "never";
  if (resetRaw === "daily") {
    reset = "daily";
  } else if (resetRaw && resetRaw !== "never") {
    warnOnce(
      `[search-limit] ${FREE_SEARCH_RESET_ENV}="${resetRaw.slice(0, 40)}" is not supported. Use "never" or "daily". Using "never".`,
    );
  }

  const secret = env[VISITOR_COOKIE_SECRET_ENV]?.trim() ?? "";

  return {
    limit: parsePositiveInt(env[FREE_SEARCH_LIMIT_ENV], DEFAULT_FREE_SEARCH_LIMIT, 10000),
    reset,
    ipDailyCap: parsePositiveInt(env[FREE_SEARCH_IP_DAILY_CAP_ENV], DEFAULT_IP_DAILY_CAP, 100000),
    countLoadMore: parseFlag(env[FREE_SEARCH_COUNT_LOAD_MORE_ENV], false),
    cookieSecret: secret.length >= MIN_COOKIE_SECRET_LENGTH ? secret : null,
  };
}
