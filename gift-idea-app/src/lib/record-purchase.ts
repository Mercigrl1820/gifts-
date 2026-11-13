import { createSearchLimitStore } from "@/lib/search-limit-store";
import { trackServerPurchase } from "@/lib/funnel-server";
import { isVisitorId } from "@/lib/public-visitor-id";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/stripe-env";
import {
  SUBSCRIPTION_ID_PATTERN,
  readCustomerId,
  readSubscriptionSnapshot,
  type SubscriptionSnapshot,
} from "@/lib/subscription-access";
import { warnOnce } from "@/lib/warn-once";

const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;

export type CheckoutMode = "payment" | "subscription" | "setup";

export type PaidCheckout = {
  sessionId: string;
  visitorId: string;
  customerId: string | null;
  mode: CheckoutMode | null;
  subscription: SubscriptionSnapshot | null;
};

export function readPaidCheckout(value: unknown): PaidCheckout | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sessionId = typeof record.id === "string" ? record.id : "";
  const reference = record.client_reference_id;
  const visitorId = typeof reference === "string" ? reference : "";
  if (record.payment_status !== "paid") return null;
  if (!CHECKOUT_SESSION_ID.test(sessionId) || !isVisitorId(visitorId)) return null;

  const mode = record.mode === "payment" || record.mode === "subscription" || record.mode === "setup"
    ? record.mode
    : null;
  const customerId = readCustomerId(record.customer);
  const subscription = subscriptionFromSession(record, mode, customerId);
  return { sessionId, visitorId, customerId, mode, subscription };
}

function subscriptionFromSession(
  record: Record<string, unknown>,
  mode: CheckoutMode | null,
  customerId: string | null,
): SubscriptionSnapshot | null {
  const parsed = readSubscriptionSnapshot(record.subscription);
  if (parsed) return parsed;
  if (mode !== "subscription" || !customerId) return null;
  const subscriptionId = typeof record.subscription === "string" ? record.subscription : "";
  if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) return null;
  return {
    customerId,
    subscriptionId,
    status: "active",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}

async function hydrateSubscription(snapshot: SubscriptionSnapshot): Promise<SubscriptionSnapshot> {
  if (snapshot.currentPeriodEnd !== null) return snapshot;
  const secretKey = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  if (!secretKey) return snapshot;
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(snapshot.subscriptionId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" },
    );
    if (!response.ok) return snapshot;
    return readSubscriptionSnapshot(await response.json()) ?? snapshot;
  } catch {
    return snapshot;
  }
}

/**
 * Store access for the visitor and record the purchase funnel event once.
 * A one-time payment stays on. A subscription lasts through the paid period.
 * Returns false when Redis is not configured or the write fails.
 */
export async function storeVerifiedPurchase(checkout: PaidCheckout, request: Request): Promise<boolean> {
  const store = createSearchLimitStore();
  if (!store) {
    warnOnce(
      "[search-limit] A Stripe payment was verified, but Upstash Redis is not configured, so paid status was not stored.",
    );
    return false;
  }

  if (checkout.customerId) {
    await store.saveBillingCustomer(checkout.visitorId, checkout.customerId);
  }

  if (checkout.subscription) {
    const snapshot = await hydrateSubscription(checkout.subscription);
    await store.saveSubscription(checkout.visitorId, snapshot);
    await store.saveBillingCustomer(checkout.visitorId, snapshot.customerId);
  } else {
    await store.grantUnlimited(checkout.visitorId, "purchase");
  }

  const firstTime = await store.claimPurchaseEvent(checkout.sessionId);
  if (firstTime) await trackServerPurchase(request);
  return true;
}

export type SubscriptionUpdateResult = "saved" | "unlinked" | "unavailable";

/** Apply a subscription.updated or subscription.deleted event to the visitor who paid. */
export async function storeSubscriptionUpdate(snapshot: SubscriptionSnapshot): Promise<SubscriptionUpdateResult> {
  const store = createSearchLimitStore();
  if (!store) return "unavailable";
  try {
    const visitorId = await store.readVisitorByCustomer(snapshot.customerId);
    if (!visitorId) return "unlinked";
    await store.saveSubscription(visitorId, snapshot);
    return "saved";
  } catch {
    warnOnce("[search-limit] Could not store a subscription update.");
    return "unavailable";
  }
}
