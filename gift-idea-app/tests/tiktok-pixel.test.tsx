/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";
import RootLayout from "../src/app/layout";
import { resetTikTokConsentForTests, writeAdsConsent } from "../src/lib/tiktok";
import { idea, jsonResponse } from "./fixtures";

vi.mock("../src/app/globals.css", () => ({}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/script", () => ({
  default: ({
    id,
    strategy,
    children,
  }: {
    id?: string;
    strategy?: string;
    children?: React.ReactNode;
  }) => (
    <script id={id} data-strategy={strategy}>
      {children}
    </script>
  ),
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => null,
}));

const fetchMock = vi.fn();
const track = vi.fn();

describe("TikTok pixel install and events", () => {
  beforeEach(() => {
    localStorage.clear();
    track.mockReset();
    document.cookie = "gift_ads_consent=; Path=/; Max-Age=0";
    resetTikTokConsentForTests();
    window.ttq = {
      load: vi.fn(),
      page: vi.fn(),
      track,
      holdConsent: vi.fn(),
      grantConsent: vi.fn(),
      revokeConsent: vi.fn(),
    };
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ ideas: [idea("Cozy Blanket"), idea("Trail Map")] }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    delete window.ttq;
  });

  it("loads the standard base code from the root layout after interactive", () => {
    render(
      <RootLayout>
        <div>app</div>
      </RootLayout>,
    );

    const script = document.getElementById("tiktok-pixel");
    expect(script).not.toBeNull();
    expect(script).toHaveAttribute("data-strategy", "afterInteractive");
    const code = script?.textContent ?? "";
    expect(code).toContain("ttq.holdConsent();");
    expect(code).toContain("globalPrivacyControl");
    expect(code).toContain("ttq.load('DBPIPN3C77U4J2JR7E1G');");
    expect(code).toContain("ttq.page();");
    expect(code.indexOf("ttq.holdConsent();")).toBeLessThan(code.indexOf("ttq.load('DBPIPN3C77U4J2JR7E1G');"));
    expect(code.indexOf('choice === "granted"')).toBeLessThan(code.indexOf("ttq.load('DBPIPN3C77U4J2JR7E1G');"));
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("does not load the pixel until the visitor accepts, and keeps it off after decline or GPC", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RootLayout>
        <div>app</div>
      </RootLayout>,
    );

    expect(window.ttq?.load).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(window.ttq?.load).not.toHaveBeenCalled();
    expect(window.ttq?.grantConsent).not.toHaveBeenCalled();

    unmount();
    resetTikTokConsentForTests();
    window.__giftsTikTokLoaded = false;
    document.cookie = "gift_ads_consent=; Path=/; Max-Age=0";
    render(
      <RootLayout>
        <div>app</div>
      </RootLayout>,
    );
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(window.ttq?.grantConsent).toHaveBeenCalled();
    expect(window.ttq?.load).toHaveBeenCalledWith("DBPIPN3C77U4J2JR7E1G");
    expect(window.ttq?.page).toHaveBeenCalled();

    cleanup();
    resetTikTokConsentForTests();
    window.__giftsTikTokLoaded = false;
    Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: true });
    render(
      <RootLayout>
        <div>app</div>
      </RootLayout>,
    );
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(window.ttq?.load).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: undefined });
  });

  it("tracks Search on quiz submit without personal free text, then retailer clicks", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /start finding gifts/i }));
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    expect(track).not.toHaveBeenCalled();
    expect(screen.getByText(/please select at least an occasion/i)).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Birthday" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Friend" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sarah/i), { target: { value: "Sarah" } });
    fireEvent.change(screen.getByPlaceholderText(/loves cooking/i), {
      target: { value: "hiking and coffee" },
    });
    writeAdsConsent("granted");
    await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));

    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("Search", {
      query: "Birthday for Friend",
      occasion: "Birthday",
      recipient_type: "Friend",
    });
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/Sarah|hiking|coffee/i);

    await user.click(screen.getAllByRole("link", { name: /search on amazon/i })[0]);
    await user.click(screen.getAllByRole("link", { name: /search on walmart/i })[1]);

    expect(track).toHaveBeenNthCalledWith(2, "ClickButton", {
      content_name: "Cozy Blanket",
      retailer: "Amazon",
    });
    expect(track).toHaveBeenNthCalledWith(3, "ClickButton", {
      content_name: "Trail Map",
      retailer: "Walmart",
    });
  });

  it("still shows gift ideas when the pixel throws", async () => {
    track.mockImplementation(() => {
      throw new Error("pixel blocked");
    });
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /start finding gifts/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Christmas" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Parent" } });
    writeAdsConsent("granted");
    await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "Search",
      expect.objectContaining({ occasion: "Christmas", recipient_type: "Parent" }),
    );

    await user.click(screen.getAllByRole("link", { name: /search on amazon/i })[0]);
    expect(screen.getByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();
  });
});
