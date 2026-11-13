/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";
import { idea, jsonResponse } from "./fixtures";

const analyticsTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: analyticsTrack,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fetchMock = vi.fn();
const pixel = vi.fn();

async function fillRequiredFields() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /start finding gifts/i }));
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Birthday" } });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Friend" } });
  return user;
}

describe("free search limit modal", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    analyticsTrack.mockReset();
    pixel.mockReset();
    fetchMock.mockReset();
    window.ttq = { load: vi.fn(), page: vi.fn(), track: pixel };
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    delete window.ttq;
    window.history.pushState({}, "", "/");
  });

  it("opens the pricing modal with the configured allowance when a search is refused", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ limitReached: true, limit: 2 }, 402));
    render(<Home />);
    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("dialog", { name: /upgrade your plan/i })).toBeInTheDocument();
    expect(screen.getByText("You've used your 2 free searches.")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(analyticsTrack).toHaveBeenCalledWith("limit_hit", { limit: 2 });
    expect(analyticsTrack).toHaveBeenCalledWith("pricing_modal_opened", { reason: "search_limit" });
    expect(pixel).toHaveBeenCalledWith("LimitHit", expect.objectContaining({ value: 2 }));
    expect(pixel).toHaveBeenCalledWith(
      "PricingModalOpened",
      expect.objectContaining({ description: "search_limit" }),
    );
  });

  it("uses the limit from the response and opens from Load more and the upgrade button", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: [idea("Cozy Blanket")] }))
      .mockResolvedValueOnce(jsonResponse({ limitReached: true, limit: 4 }, 402));
    render(<Home />);
    const user = await fillRequiredFields();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /load more gifts/i }));
    expect(await screen.findByText("You've used your 4 free searches.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    cleanup();
    analyticsTrack.mockClear();
    window.history.pushState({}, "", "/");
    render(<Home />);
    const homeUser = userEvent.setup();
    await homeUser.click(screen.getByRole("button", { name: /upgrade/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/you've used your/i)).not.toBeInTheDocument();
    expect(analyticsTrack).toHaveBeenCalledWith("pricing_modal_opened", { reason: "upgrade" });
  });

  it("records a purchase pixel after Stripe sends the shopper back", async () => {
    window.history.pushState({}, "", "/?session_id=cs_test_return1234");
    fetchMock.mockResolvedValueOnce(jsonResponse({ paid: true }));
    render(<Home />);

    await waitFor(() => {
      expect(pixel).toHaveBeenCalledWith(
        "CompletePayment",
        expect.objectContaining({ content_name: "search_plan" }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/confirm",
      expect.objectContaining({ method: "POST" }),
    );
    expect(sessionStorage.getItem("gift-purchase-tracked:cs_test_return1234")).toBe("1");
    expect(analyticsTrack).not.toHaveBeenCalledWith("purchase", expect.anything());
  });
});
