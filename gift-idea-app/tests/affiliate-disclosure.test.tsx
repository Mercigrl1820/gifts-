/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";
import PrivacyPage from "../src/app/privacy/page";
import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
  RESULTS_AFFILIATE_DISCLOSURE,
} from "../src/lib/affiliate-disclosure";
import { CONTACT_EMAIL } from "../src/lib/site";
import { idea, jsonResponse } from "./fixtures";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fetchMock = vi.fn();

function precedes(earlier: HTMLElement, later: HTMLElement) {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("Affiliate disclosure", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("keeps a readable commission notice and the Amazon sentence in the home footer", () => {
    render(<Home />);

    const notice = screen.getByRole("note", { name: "Affiliate disclosure" });
    expect(notice).toHaveTextContent(GENERAL_AFFILIATE_DISCLOSURE);
    expect(notice).toHaveTextContent(AMAZON_ASSOCIATES_DISCLOSURE);
    expect(notice.className).not.toMatch(/text-gray-400/);
    expect(notice.className).not.toMatch(/\bsr-only\b/);
    expect(notice.closest("footer")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${CONTACT_EMAIL}`,
    );
    expect(screen.getByText("Gifts4You is operated by Nicholas Daniel")).toBeInTheDocument();
  });

  it("shows the disclosure above product links on the results view", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ideas: [idea("Cozy Blanket"), idea("Trail Map")],
      })
    );

    render(<Home />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /start finding gifts/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Birthday" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Friend" } });
    await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();

    const notice = screen.getAllByRole("note", { name: "Affiliate disclosure" }).find((item) => item.closest("footer") === null);
    expect(notice).toBeTruthy();
    expect(notice).toHaveTextContent(GENERAL_AFFILIATE_DISCLOSURE);
    expect(notice).toHaveTextContent(AMAZON_ASSOCIATES_DISCLOSURE);
    expect(notice).not.toHaveTextContent(RESULTS_AFFILIATE_DISCLOSURE);
    expect(notice?.className).toMatch(/text-violet-950/);
    expect(notice?.className).not.toMatch(/text-xs|text-gray-400|sr-only/);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");

    const nearLinks = screen.getByText(RESULTS_AFFILIATE_DISCLOSURE, { exact: false });
    expect(nearLinks.closest("footer")).toBeNull();
    expect(nearLinks.className).toMatch(/text-sm/);
    expect(nearLinks.className).toMatch(/text-gray-600/);
    const aboutNearLinks = screen.getAllByRole("link", { name: "About" }).find((link) => link.closest("footer") === null);
    expect(aboutNearLinks).toHaveAttribute("href", "/about");
    expect(nearLinks.contains(aboutNearLinks as Node)).toBe(true);

    const amazon = screen.getAllByRole("link", { name: /search on amazon/i })[0];
    const walmart = screen.getAllByRole("link", { name: /search on walmart/i })[0];
    expect(precedes(notice as HTMLElement, amazon)).toBe(true);
    expect(precedes(nearLinks, amazon)).toBe(true);
    expect(precedes(nearLinks, walmart)).toBe(true);
    expect(precedes(notice as HTMLElement, walmart)).toBe(true);
    expect(amazon).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(walmart).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(amazon.className).not.toMatch(/amber/);
    expect(walmart.className).not.toMatch(/blue/);
    expect(screen.queryByText("$25–$40")).not.toBeInTheDocument();
  });

  it("keeps the privacy policy consistent with the shopper disclosure", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "10. Affiliate links" })).toBeInTheDocument();
    expect(screen.getAllByText(/we may use affiliate links/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(GENERAL_AFFILIATE_DISCLOSURE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(AMAZON_ASSOCIATES_DISCLOSURE, { exact: false }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/do not use Target or impact\.com links/i)).toBeInTheDocument();
    expect(screen.queryByText(/impact\.com partner network/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Gifts4You is operated by Nicholas Daniel").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: CONTACT_EMAIL }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(document.body.textContent).not.toMatch(/nkd23@comcast\.net/i);
    expect(document.body.textContent).not.toMatch(/GiftIdea \(/);
  });
});
