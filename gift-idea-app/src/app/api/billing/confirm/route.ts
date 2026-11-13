import { NextResponse } from "next/server";
import { readPaidCheckout, storeVerifiedPurchase } from "@/lib/record-purchase";
import { readSearchLimitConfig } from "@/lib/search-limit-config";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/stripe-env";
import { applyVisitorCookies, requestIsSecure, resolveVisitor } from "@/lib/visitor-cookie";

const SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;

/**
 * The browser sends the session id Stripe appended on the way back from checkout.
 * The session is loaded from Stripe and must be paid for this visitor's signed cookie.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ paid: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const sessionId =
    body && typeof body === "object" && "sessionId" in body
      ? (body as { sessionId?: unknown }).sessionId
      : undefined;
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId) || sessionId.length > 255) {
    return NextResponse.json({ paid: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const secretKey = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  if (!secretKey) {
    return NextResponse.json(
      { paid: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const config = readSearchLimitConfig();
  const visitor = config.cookieSecret
    ? await resolveVisitor(request.headers.get("cookie"), config.cookieSecret)
    : null;

  let paidForVisitor = false;
  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: "no-store",
      },
    );
    if (stripeResponse.ok) {
      const checkout = readPaidCheckout(await stripeResponse.json());
      paidForVisitor = Boolean(
        checkout && visitor && checkout.visitorId === visitor.visitorId && checkout.sessionId === sessionId,
      );
      if (paidForVisitor && checkout) {
        try {
          await storeVerifiedPurchase(checkout, request);
        } catch {
          console.warn("[search-limit] Could not store a verified purchase.");
        }
      }
    }
  } catch {
    paidForVisitor = false;
  }

  const response = NextResponse.json(
    { paid: paidForVisitor },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (visitor) applyVisitorCookies(response, visitor, requestIsSecure(request));
  return response;
}
