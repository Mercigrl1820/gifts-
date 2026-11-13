"use client";

import { track } from "@vercel/analytics";
import { trackTikTokEvent } from "@/lib/tiktok";

export type PricingOpenReason = "upgrade" | "profile_limit" | "search_limit";

function trackVercel(name: string, properties: Record<string, string | number | boolean | null>) {
  try {
    track(name, properties);
  } catch {
    // Analytics must not block search or the pricing window.
  }
}

export function trackLimitHit(limit: number) {
  trackVercel("limit_hit", { limit });
  trackTikTokEvent("LimitHit", { value: limit, content_name: "free_search_limit" });
}

export function trackPricingModalOpened(reason: PricingOpenReason) {
  trackVercel("pricing_modal_opened", { reason });
  trackTikTokEvent("PricingModalOpened", {
    content_name: "pricing_modal",
    description: reason,
  });
}

/** TikTok pixel only. Vercel records purchase once on the server after Stripe is verified. */
export function trackPurchase() {
  trackTikTokEvent("CompletePayment", {
    content_name: "search_plan",
    content_type: "product",
  });
}
