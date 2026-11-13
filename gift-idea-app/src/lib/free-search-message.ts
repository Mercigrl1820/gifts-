export function readFreeSearchLimit(value: unknown, fallback = 2): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10000) {
    return fallback;
  }
  return value;
}

/** Shopper-facing sentence. The number comes from the server so it matches FREE_SEARCH_LIMIT. */
export function freeSearchLimitMessage(limit: number): string {
  const count = readFreeSearchLimit(limit);
  const noun = count === 1 ? "search" : "searches";
  return `You've used your ${count} free ${noun}.`;
}

export function isSearchLimitPayload(
  status: number,
  data: unknown,
): data is { limitReached: true; limit?: unknown } {
  return (
    status === 402 &&
    !!data &&
    typeof data === "object" &&
    (data as { limitReached?: unknown }).limitReached === true
  );
}
