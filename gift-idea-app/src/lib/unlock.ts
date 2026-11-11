export const UNLOCK_CODES_ENV = "GIFT_UNLOCK_CODES";

export type UnlockResult = { ok: true; profileLimit: number } | { ok: false };

const MAX_CODE_LENGTH = 100;

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function readProfileLimit(value: string): number | null {
  if (!/^[1-9]\d{0,2}$/.test(value)) return null;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 999) return null;
  return limit;
}

/**
 * Parse a comma-separated list of CODE:PROFILE_LIMIT pairs.
 * Invalid entries are ignored. An empty or missing value yields no codes.
 */
export function parseUnlockCodes(configured: string | undefined): Map<string, number> {
  const codes = new Map<string, number>();
  if (typeof configured !== "string" || configured.trim() === "") return codes;

  for (const part of configured.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.lastIndexOf(":");
    if (separator <= 0) continue;

    const code = normalizeCode(trimmed.slice(0, separator));
    const limit = readProfileLimit(trimmed.slice(separator + 1).trim());
    if (!code || code.length > MAX_CODE_LENGTH || limit === null || codes.has(code)) continue;
    codes.set(code, limit);
  }

  return codes;
}

export function matchUnlockCode(submitted: unknown, configured: string | undefined): UnlockResult {
  if (typeof submitted !== "string") return { ok: false };
  const code = normalizeCode(submitted);
  if (!code || code.length > MAX_CODE_LENGTH) return { ok: false };

  const limit = parseUnlockCodes(configured).get(code);
  if (limit === undefined) return { ok: false };
  return { ok: true, profileLimit: limit };
}

export function readUnlockCodesFromEnv(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[UNLOCK_CODES_ENV];
  return typeof value === "string" ? value : undefined;
}
