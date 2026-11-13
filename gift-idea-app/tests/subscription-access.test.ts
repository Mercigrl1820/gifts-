import { describe, expect, it } from "vitest";
import {
  readSubscriptionSnapshot,
  subscriptionGrantsAccess,
  type SubscriptionSnapshot,
} from "../src/lib/subscription-access";

const now = 1_700_000_000;

function snapshot(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    customerId: "cus_test12345678",
    subscriptionId: "sub_test12345678",
    status: "active",
    currentPeriodEnd: now + 1000,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("subscription access", () => {
  it("reads the period end from the subscription item when Stripe puts it there", () => {
    const parsed = readSubscriptionSnapshot({
      id: "sub_test12345678",
      customer: { id: "cus_test12345678" },
      status: "active",
      items: { data: [{ current_period_end: 123 }] },
    });
    expect(parsed?.currentPeriodEnd).toBe(123);
  });

  it("allows a canceled plan until the paid period ends, then stops", () => {
    expect(subscriptionGrantsAccess(snapshot({ status: "canceled", currentPeriodEnd: now + 10 }), now)).toBe(true);
    expect(subscriptionGrantsAccess(snapshot({ status: "canceled", currentPeriodEnd: now - 1 }), now)).toBe(false);
    expect(subscriptionGrantsAccess(snapshot({ status: "canceled", currentPeriodEnd: null }), now)).toBe(false);
  });

  it("keeps an active plan through a short renewal-webhook delay and not after a scheduled cancel", () => {
    expect(subscriptionGrantsAccess(snapshot({ currentPeriodEnd: now - 60 }), now)).toBe(true);
    expect(
      subscriptionGrantsAccess(
        snapshot({ currentPeriodEnd: now - 60, cancelAtPeriodEnd: true }),
        now,
      ),
    ).toBe(false);
    expect(subscriptionGrantsAccess(snapshot({ status: "active", currentPeriodEnd: null }), now)).toBe(true);
    expect(subscriptionGrantsAccess(snapshot({ status: "unpaid", currentPeriodEnd: now + 1000 }), now)).toBe(false);
  });
});
