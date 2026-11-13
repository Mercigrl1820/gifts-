import type { SearchLimitStore } from "../src/lib/search-limit";

export function memorySearchStore() {
  const counts = new Map<string, number>();
  const unlimited = new Map<string, "unlock" | "purchase">();
  const purchases = new Set<string>();
  let fail = false;

  const store: SearchLimitStore = {
    async isUnlimited(visitorId) {
      if (fail) throw new Error("store down");
      return unlimited.has(visitorId);
    },
    async grantUnlimited(visitorId, source) {
      if (fail) throw new Error("store down");
      unlimited.set(visitorId, source);
    },
    async increment(key) {
      if (fail) throw new Error("store down");
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async claimPurchaseEvent(sessionId) {
      if (fail) throw new Error("store down");
      if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId) || purchases.has(sessionId)) return false;
      purchases.add(sessionId);
      return true;
    },
  };

  return {
    store,
    counts,
    unlimited,
    purchases,
    setFail(next: boolean) {
      fail = next;
    },
  };
}
