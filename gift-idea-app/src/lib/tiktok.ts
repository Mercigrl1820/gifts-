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
  holdConsent?(): void;
  revokeConsent?(): void;
  grantConsent?(): void;
}

declare global {
  interface Window {
    ttq?: TikTokPixel;
    TiktokAnalyticsObject?: string;
    __giftsTikTokLoaded?: boolean;
  }

  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}

export type TikTokTrackedEvent =
  | "Search"
  | "ClickButton"
  | "LimitHit"
  | "PricingModalOpened"
  | "CompletePayment";

export type RetailerName = "Amazon" | "Walmart";

/** First-party cookie. "granted" allows the TikTok pixel. "denied" keeps it off. */
export const ADS_CONSENT_COOKIE = "gift_ads_consent";

export type AdsConsent = "granted" | "denied";

/**
 * TikTok's pixel queue. holdConsent runs immediately.
 * load and page run only when this browser already granted consent and Global Privacy Control is off.
 */
const TIKTOK_PIXEL_BASE_CODE = `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};

  ttq.holdConsent();
  try {
    var gpc = navigator.globalPrivacyControl === true;
    var name = "ADS_COOKIE=";
    var choice = "";
    var parts = d.cookie ? d.cookie.split("; ") : [];
    for (var c = 0; c < parts.length; c++) {
      if (parts[c].indexOf(name) === 0) choice = decodeURIComponent(parts[c].slice(name.length));
    }
    if (!gpc && choice === "granted") {
      ttq.grantConsent();
      ttq.load('PIXEL_ID');
      ttq.page();
      w.__giftsTikTokLoaded = true;
    }
  } catch (err) {}
}(window, document, 'ttq');`;

export function resolveTikTokPixelId(raw?: string): string {
  const source = raw === undefined ? process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID : raw;
  const value = source?.trim() ?? "";
  if (PIXEL_ID_PATTERN.test(value)) return value;
  return DEFAULT_TIKTOK_PIXEL_ID;
}

export function tiktokPixelBaseCode(pixelId?: string): string {
  const id = resolveTikTokPixelId(pixelId);
  return TIKTOK_PIXEL_BASE_CODE.replaceAll("PIXEL_ID", id).replaceAll("ADS_COOKIE", ADS_CONSENT_COOKIE);
}

let memoryConsent: AdsConsent | null = null;

function readCookieValue(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function readAdsConsent(cookieHeader: string | null | undefined): AdsConsent | null {
  const value = readCookieValue(cookieHeader ?? "", ADS_CONSENT_COOKIE);
  if (value === "granted" || value === "denied") return value;
  return null;
}

export function globalPrivacyControlEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.globalPrivacyControl === true;
}

export function adsTrackingAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (globalPrivacyControlEnabled()) return false;
  if (typeof document !== "undefined") return readAdsConsent(document.cookie) === "granted";
  return memoryConsent === "granted";
}

export function writeAdsConsent(choice: AdsConsent): void {
  memoryConsent = choice;
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ADS_CONSENT_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function resetTikTokConsentForTests(): void {
  memoryConsent = null;
  if (typeof window !== "undefined") window.__giftsTikTokLoaded = false;
}

function callPixel(method: "holdConsent" | "revokeConsent" | "grantConsent"): void {
  const pixel = window.ttq;
  const fn = pixel?.[method];
  if (typeof fn !== "function") return;
  try {
    fn.call(pixel);
  } catch {
    // A blocked pixel must not break the page.
  }
}

/** Grant and load after an accept. Hold and revoke when consent is missing, declined, or GPC is on. */
export function startTikTokPixel(): void {
  if (typeof window === "undefined") return;
  if (!adsTrackingAllowed()) {
    callPixel("revokeConsent");
    callPixel("holdConsent");
    return;
  }
  callPixel("grantConsent");
  if (window.__giftsTikTokLoaded) return;
  const pixel = window.ttq;
  if (!pixel || typeof pixel.load !== "function" || typeof pixel.page !== "function") return;
  try {
    pixel.load(resolveTikTokPixelId());
    pixel.page();
    window.__giftsTikTokLoaded = true;
  } catch {
    // A blocked pixel must not break the page.
  }
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
  if (!adsTrackingAllowed()) return;

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
