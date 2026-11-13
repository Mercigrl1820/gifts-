import type { SearchLimitStore } from "../src/lib/search-limit";
import {
  coerceSubscriptionSnapshot,
  subscriptionGrantsAccess,
  type SubscriptionSnapshot,
} from "../src/lib/subscription-access";
import { isVisitorId } from "../src/lib/public-visitor-id";

const CUSTOMER_ID = /^cus_[A-Za-z0-9]{8,64}$/;

export function memorySearchStore() {
  const counts = new Map<string, number>();
  const unlimited = new Map<string, "unlock" | "purchase">();
  const purchases = new Set<string>();
  const customers = new Map<string, string>();
  const visitorsByCustomer = new Map<string, string>();
  const subscriptions = new Map<string, SubscriptionSnapshot>();
  let fail = false;

  const store: SearchLimitStore = {
    async isUnlimited(visitorId) {
      if (fail) throw new Error("store down");
      if (unlimited.has(visitorId)) return true;
      const subscription = subscriptions.get(visitorId);
      if (!subscription) return false;
      return subscriptionGrantsAccess(subscription, Math.floor(Date.now() / 1000));
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
    async saveBillingCustomer(visitorId, customerId) {
      if (fail) throw new Error("store down");
      if (!isVisitorId(visitorId) || !CUSTOMER_ID.test(customerId)) return;
      customers.set(visitorId, customerId);
      visitorsByCustomer.set(customerId, visitorId);
    },
    async readBillingCustomer(visitorId) {
      if (fail) throw new Error("store down");
      const value = customers.get(visitorId) ?? null;
      return value && CUSTOMER_ID.test(value) ? value : null;
    },
    async readVisitorByCustomer(customerId) {
      if (fail) throw new Error("store down");
      const value = visitorsByCustomer.get(customerId) ?? null;
      return value && isVisitorId(value) ? value : null;
    },
    async saveSubscription(visitorId, snapshot) {
      if (fail) throw new Error("store down");
      const stored = coerceSubscriptionSnapshot(snapshot);
      if (!stored || !isVisitorId(visitorId)) return;
      subscriptions.set(visitorId, stored);
    },
    async readSubscription(visitorId) {
      if (fail) throw new Error("store down");
      return subscriptions.get(visitorId) ?? null;
    },
  };

  return {
    store,
    counts,
    unlimited,
    purchases,
    customers,
    subscriptions,
    setFail(next: boolean) {
      fail = next;
    },
  };
}
