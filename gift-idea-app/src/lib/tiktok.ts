import type { Occasion, Relationship } from "@/types";

/** Public pixel id used when NEXT_PUBLIC_TIKTOK_PIXEL_ID is unset or invalid. */
export const DEFAULT_TIKTOK_PIXEL_ID = "DBPIPN3C77U4J2JR7E1G";

const PIXEL_ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

/**
 * Parameters sent to TikTok. Values stay primitive so call sites cannot
 * accidentally attach objects that might carry personal data.
 */
export interface TikTokPixelEventParams {
  query?: string;
  content_id?: string;
  content_type?: string;
  content_name?: string;
  content_category?: string;
  description?: string;
  currency?: string;
  value?: number;
  occasion?: string;
  recipient_type?: string;
  retailer?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/** Subset of the TikTok Pixel queue used by this app. */
export interface TikTokPixel {
  load(pixelId: string, options?: TikTokPixelEventParams): void;
  page(params?: TikTokPixelEventParams): void;
  track(
    event: string,
    params?: TikTokPixelEventParams,
    options?: TikTokPixelEventParams,
  ): void;
  identify?(params?: TikTokPixelEventParams): void;
  instance?(pixelId: string): TikTokPixel;
  instances?(pixelId: string): TikTokPixel;
}

declare global {
  interface Window {
    ttq?: TikTokPixel;
    TiktokAnalyticsObject?: string;
  }
}

export type TikTokTrackedEvent =
  | "Search"
  | "ClickButton"
  | "LimitHit"
  | "PricingModalOpened"
  | "CompletePayment";

export type RetailerName = "Amazon" | "Walmart";

/**
 * TikTok's standard pixel base code. Ends with ttq.load(id); ttq.page();
 * so a page view is reported once events.js is queued.
 */
const TIKTOK_PIXEL_BASE_CODE = `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.load('PIXEL_ID');
  ttq.page();
}(window, document, 'ttq');`;

export function resolveTikTokPixelId(raw?: string): string {
  const source = raw === undefined ? process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID : raw;
  const value = source?.trim() ?? "";
  if (PIXEL_ID_PATTERN.test(value)) return value;
  return DEFAULT_TIKTOK_PIXEL_ID;
}

export function tiktokPixelBaseCode(pixelId?: string): string {
  const id = resolveTikTokPixelId(pixelId);
  return TIKTOK_PIXEL_BASE_CODE.replace("PIXEL_ID", id);
}

/**
 * Calls window.ttq?.track and swallows failures.
 * Safe during SSR and when an ad blocker never defines ttq, or when track throws.
 */
export function trackTikTokEvent(
  event: TikTokTrackedEvent,
  params?: TikTokPixelEventParams,
): void {
  if (typeof window === "undefined") return;

  try {
    const pixel = window.ttq;
    const track = pixel?.track;
    if (typeof track !== "function") return;
    track.call(pixel, event, params);
  } catch {
    // A blocked or broken pixel must not break search or shopping links.
  }
}

/**
 * Gift quiz submit. Occasion and recipient type are fixed choices, not free text.
 * Do not add names, emails, addresses, interests, or other personal notes here.
 */
export function trackGiftSearch(input: {
  occasion: Occasion;
  recipientType: Relationship;
}): void {
  const occasion = input.occasion.trim();
  const recipientType = input.recipientType.trim();
  trackTikTokEvent("Search", {
    query: `${occasion} for ${recipientType}`,
    occasion,
    recipient_type: recipientType,
  });
}

/** Retailer outbound click. Gift title is the generated idea name, not a person's name. */
export function trackRetailerClick(input: {
  retailer: RetailerName;
  giftTitle: string;
}): void {
  trackTikTokEvent("ClickButton", {
    content_name: input.giftTitle.trim(),
    retailer: input.retailer,
  });
}
