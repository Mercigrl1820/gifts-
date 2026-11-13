import { NextResponse } from "next/server";
import { isVisitorId } from "@/lib/public-visitor-id";
import { readPaidCheckout, storeVerifiedPurchase } from "@/lib/record-purchase";
import { STRIPE_WEBHOOK_SECRET_ENV } from "@/lib/stripe-env";
import { verifyStripeSignature } from "@/lib/stripe-signature";

const PURCHASE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function checkoutObject(event: unknown): unknown {
  if (!event || typeof event !== "object" || !("data" in event)) return null;
  const data = (event as { data?: unknown }).data;
  if (!data || typeof data !== "object" || !("object" in data)) return null;
  return (data as { object?: unknown }).object;
}

/**
 * Stripe tells us a checkout finished. The signature is checked before the body is trusted.
 * Paid status is stored for the visitor id Stripe received as client_reference_id.
 * Shopper details in the payload are never logged or returned.
 */
export async function POST(request: Request) {
  const secret = process.env[STRIPE_WEBHOOK_SECRET_ENV]?.trim() ?? "";
  if (!secret) {
    return NextResponse.json(
      { received: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json(
      { received: false },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(payload) as unknown;
  } catch {
    return NextResponse.json(
      { received: false },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const type =
    event && typeof event === "object" && "type" in event
      ? (event as { type?: unknown }).type
      : undefined;
  if (typeof type !== "string" || !PURCHASE_EVENTS.has(type)) {
    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const session = checkoutObject(event);
  const paymentStatus =
    session && typeof session === "object" && "payment_status" in session
      ? (session as { payment_status?: unknown }).payment_status
      : undefined;
  if (paymentStatus !== "paid") {
    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const checkout = readPaidCheckout(session);
  if (!checkout || !isVisitorId(checkout.visitorId)) {
    console.warn("[search-limit] A paid checkout had no visitor id, so the search limit was not removed.");
    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const stored = await storeVerifiedPurchase(checkout, request);
    if (!stored) {
      return NextResponse.json(
        { received: false },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    console.warn("[search-limit] Could not store a verified purchase.");
    return NextResponse.json(
      { received: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}
