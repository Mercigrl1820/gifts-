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
import { DEFAULT_TIKTOK_PIXEL_ID } from "../src/lib/tiktok";
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
    window.ttq = {
      load: vi.fn(),
      page: vi.fn(),
      track,
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
    expect(code).toContain(`ttq.load('${DEFAULT_TIKTOK_PIXEL_ID}');`);
    expect(code).toContain("ttq.page();");
    expect(code.indexOf("ttq.load(")).toBeLessThan(code.indexOf("ttq.page();"));
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
