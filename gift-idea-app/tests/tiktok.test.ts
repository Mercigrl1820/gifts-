import { afterEach, describe, expect, it, vi } from "vitest";
import type { Occasion, Relationship } from "../src/types";
import {
  DEFAULT_TIKTOK_PIXEL_ID,
  resolveTikTokPixelId,
  tiktokPixelBaseCode,
  trackGiftSearch,
  trackRetailerClick,
  trackTikTokEvent,
} from "../src/lib/tiktok";

const occasion: Occasion = "Birthday";
const recipientType: Relationship = "Friend";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("TikTok pixel id", () => {
  it("falls back to the default pixel id when the env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "");
    expect(DEFAULT_TIKTOK_PIXEL_ID).toBe("DBPIPN3C77U4J2JR7E1G");
    expect(resolveTikTokPixelId()).toBe("DBPIPN3C77U4J2JR7E1G");
    expect(tiktokPixelBaseCode()).toContain("ttq.load('DBPIPN3C77U4J2JR7E1G');");
  });

  it("uses NEXT_PUBLIC_TIKTOK_PIXEL_ID when it is a safe pixel id", () => {
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "  ABC123pixel  ");
    expect(resolveTikTokPixelId()).toBe("ABC123pixel");
    const code = tiktokPixelBaseCode();
    expect(code).toContain("ttq.load('ABC123pixel');");
    expect(code).toContain("ttq.page();");
    expect(code.indexOf("ttq.load('ABC123pixel');")).toBeLessThan(code.indexOf("ttq.page();"));
  });

  it("does not interpolate an unsafe pixel id into the snippet", () => {
    const code = tiktokPixelBaseCode("DBPI9');alert(1);//");
    expect(code).not.toContain("alert");
    expect(code).toContain("ttq.load('DBPIPN3C77U4J2JR7E1G');");
    expect(code).toContain("https://analytics.tiktok.com/i18n/pixel/events.js");
  });
});

describe("trackTikTokEvent", () => {
  it("does nothing during SSR when window is missing", () => {
    expect(typeof window).toBe("undefined");
    expect(() => trackGiftSearch({ occasion, recipientType })).not.toThrow();
    expect(() =>
      trackRetailerClick({ retailer: "Amazon", giftTitle: "Cozy Blanket" }),
    ).not.toThrow();
  });

  it("does nothing when the pixel was never installed", () => {
    vi.stubGlobal("window", {});
    expect(() => trackTikTokEvent("Search", { query: "Birthday for Friend" })).not.toThrow();
  });

  it("does nothing when ttq.track is not a function", () => {
    vi.stubGlobal("window", { ttq: { track: "blocked" } });
    expect(() => trackTikTokEvent("ClickButton", { retailer: "Walmart" })).not.toThrow();
  });

  it("swallows a throwing pixel and a throwing ttq getter", () => {
    const track = vi.fn(() => {
      throw new Error("blocked");
    });
    vi.stubGlobal("window", { ttq: { track } });
    expect(() => trackGiftSearch({ occasion, recipientType })).not.toThrow();
    expect(track).toHaveBeenCalledTimes(1);

    const blocked = {};
    Object.defineProperty(blocked, "ttq", {
      get() {
        throw new Error("getter blocked");
      },
    });
    vi.stubGlobal("window", blocked);
    expect(() =>
      trackRetailerClick({ retailer: "Walmart", giftTitle: "Trail Map" }),
    ).not.toThrow();
  });

  it("sends Search with occasion and recipient type only", () => {
    const track = vi.fn();
    const pixel = { track };
    vi.stubGlobal("window", { ttq: pixel });

    trackGiftSearch({ occasion, recipientType });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.instances[0]).toBe(pixel);
    expect(track).toHaveBeenCalledWith("Search", {
      query: "Birthday for Friend",
      occasion: "Birthday",
      recipient_type: "Friend",
    });
    const payload = track.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("recipientName");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("interests");
    expect(JSON.stringify(payload)).not.toMatch(/sarah|@|address/i);
  });

  it("sends ClickButton with the retailer and gift title", () => {
    const track = vi.fn();
    vi.stubGlobal("window", { ttq: { track } });

    trackRetailerClick({ retailer: "Amazon", giftTitle: "  Pour-Over Kettle  " });
    trackRetailerClick({ retailer: "Walmart", giftTitle: "Café Mug" });

    expect(track).toHaveBeenNthCalledWith(1, "ClickButton", {
      content_name: "Pour-Over Kettle",
      retailer: "Amazon",
    });
    expect(track).toHaveBeenNthCalledWith(2, "ClickButton", {
      content_name: "Café Mug",
      retailer: "Walmart",
    });
  });
});
