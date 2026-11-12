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
} from "../src/lib/affiliate-disclosure";
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
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();

    const notice = screen.getByRole("note", { name: "Affiliate disclosure" });
    expect(notice).toHaveTextContent(GENERAL_AFFILIATE_DISCLOSURE);
    expect(notice).toHaveTextContent(AMAZON_ASSOCIATES_DISCLOSURE);
    expect(notice.className).toMatch(/text-violet-950/);
    expect(notice.className).not.toMatch(/text-xs|text-gray-400|sr-only/);
    expect(notice.closest("footer")).toBeNull();

    const amazon = screen.getAllByRole("link", { name: /search on amazon/i })[0];
    const walmart = screen.getAllByRole("link", { name: /search on walmart/i })[0];
    expect(precedes(notice, amazon)).toBe(true);
    expect(precedes(notice, walmart)).toBe(true);
  });

  it("keeps the privacy policy consistent with the shopper disclosure", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "5. Affiliate Links" })).toBeInTheDocument();
    expect(screen.getAllByText(GENERAL_AFFILIATE_DISCLOSURE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(AMAZON_ASSOCIATES_DISCLOSURE, { exact: false }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/impact\.com partner network/i)).toBeInTheDocument();
    expect(screen.getByText(/Walmart and Target/i)).toBeInTheDocument();
  });
});
