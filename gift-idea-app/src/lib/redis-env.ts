export const UPSTASH_REDIS_REST_URL_ENV = "UPSTASH_REDIS_REST_URL";
export const UPSTASH_REDIS_REST_TOKEN_ENV = "UPSTASH_REDIS_REST_TOKEN";
export const KV_REST_API_URL_ENV = "KV_REST_API_URL";
export const KV_REST_API_TOKEN_ENV = "KV_REST_API_TOKEN";

export type RedisCredentials = {
  url: string;
  token: string;
};

function nonEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Prefer the current Upstash Marketplace names, then the older KV REST names.
 * A URL without its token (or the reverse) is treated as not configured.
 */
export function readRedisCredentials(
  env: Record<string, string | undefined> = process.env,
): RedisCredentials | null {
  const upstashUrl = nonEmpty(env[UPSTASH_REDIS_REST_URL_ENV]);
  const upstashToken = nonEmpty(env[UPSTASH_REDIS_REST_TOKEN_ENV]);
  if (upstashUrl && upstashToken) return { url: upstashUrl, token: upstashToken };

  const kvUrl = nonEmpty(env[KV_REST_API_URL_ENV]);
  const kvToken = nonEmpty(env[KV_REST_API_TOKEN_ENV]);
  if (kvUrl && kvToken) return { url: kvUrl, token: kvToken };

  return null;
}

export function redisSetupWarning(env: Record<string, string | undefined> = process.env): string {
  const names = [
    UPSTASH_REDIS_REST_URL_ENV,
    UPSTASH_REDIS_REST_TOKEN_ENV,
    KV_REST_API_URL_ENV,
    KV_REST_API_TOKEN_ENV,
  ];
  const partial = names.some((name) => nonEmpty(env[name]) !== "");
  if (partial) {
    return "[search-limit] Upstash Redis env vars are incomplete. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL and KV_REST_API_TOKEN. Allowing searches.";
  }
  return "[search-limit] Upstash Redis env vars are not set. Allowing searches until the Vercel Marketplace Upstash integration is connected.";
}
