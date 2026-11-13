import { createSearchLimitStore } from "@/lib/search-limit-store";
import { trackServerPurchase } from "@/lib/funnel-server";
import { isVisitorId } from "@/lib/public-visitor-id";
import { warnOnce } from "@/lib/warn-once";

const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;

export type PaidCheckout = {
  sessionId: string;
  visitorId: string;
};

export function readPaidCheckout(value: unknown): PaidCheckout | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const sessionId = typeof record.id === "string" ? record.id : "";
  const reference = record.client_reference_id;
  const visitorId = typeof reference === "string" ? reference : "";
  if (record.payment_status !== "paid") return null;
  if (!CHECKOUT_SESSION_ID.test(sessionId) || !isVisitorId(visitorId)) return null;
  return { sessionId, visitorId };
}

/**
 * Store unlimited access for the visitor and record the purchase funnel event once.
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

  await store.grantUnlimited(checkout.visitorId, "purchase");
  const firstTime = await store.claimPurchaseEvent(checkout.sessionId);
  if (firstTime) await trackServerPurchase(request);
  return true;
}
