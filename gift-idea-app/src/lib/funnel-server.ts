import { track } from "@vercel/analytics/server";

/** One Vercel Analytics event per verified Stripe session. Failures stay on the server. */
export async function trackServerPurchase(request: Request): Promise<void> {
  try {
    await track("purchase", { source: "stripe" }, { request: { headers: request.headers } });
  } catch {
    console.warn("[search-limit] Purchase analytics event was not recorded.");
  }
}
