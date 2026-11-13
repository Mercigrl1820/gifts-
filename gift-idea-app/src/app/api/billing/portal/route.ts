import { NextResponse } from "next/server";
import { createSearchLimitStore } from "@/lib/search-limit-store";
import { readSearchLimitConfig } from "@/lib/search-limit-config";
import { SUPPORT_EMAIL } from "@/lib/site";
import { STRIPE_SECRET_KEY_ENV } from "@/lib/stripe-env";
import { CUSTOMER_ID_PATTERN } from "@/lib/subscription-access";
import { resolveVisitor } from "@/lib/visitor-cookie";

const EMAIL_FALLBACK = `We couldn't open the billing page. Email ${SUPPORT_EMAIL} and we will cancel the plan.`;
const NO_PLAN = `We don't have a paid plan saved on this browser. Email ${SUPPORT_EMAIL} from the address you used at checkout and we will cancel it.`;

function portalError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isStripePortalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "billing.stripe.com";
  } catch {
    return false;
  }
}

/**
 * Opens Stripe's customer portal for the visitor id stored on the paid checkout.
 * The portal itself is configured in the Stripe dashboard. This route does not change that configuration.
 */
export async function POST(request: Request) {
  const secretKey = process.env[STRIPE_SECRET_KEY_ENV]?.trim() ?? "";
  const config = readSearchLimitConfig();
  if (!secretKey || !config.cookieSecret) {
    return portalError(EMAIL_FALLBACK, 503);
  }

  const visitor = await resolveVisitor(request.headers.get("cookie"), config.cookieSecret);
  const store = createSearchLimitStore();
  if (!store) return portalError(EMAIL_FALLBACK, 503);

  let customerId: string | null = null;
  try {
    customerId = await store.readBillingCustomer(visitor.visitorId);
  } catch {
    return portalError(EMAIL_FALLBACK, 503);
  }
  if (!customerId || !CUSTOMER_ID_PATTERN.test(customerId)) {
    return portalError(NO_PLAN, 404);
  }

  try {
    const body = new URLSearchParams({
      customer: customerId,
      return_url: new URL("/", request.url).toString(),
    });
    const stripeResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
    const payload = (await stripeResponse.json().catch(() => null)) as { url?: unknown } | null;
    const url = payload && typeof payload.url === "string" ? payload.url : "";
    if (!stripeResponse.ok || !isStripePortalUrl(url)) {
      return portalError(EMAIL_FALLBACK, 502);
    }
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return portalError(EMAIL_FALLBACK, 502);
  }
}
