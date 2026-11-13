/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import TermsPage from "../src/app/terms/page";
import nextConfig from "../next.config";
import { CONTACT_EMAIL } from "../src/lib/site";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

describe("Terms of Service", () => {
  afterEach(() => {
    cleanup();
  });

  it("names the operator and covers each plan's renewal, cancellation, and refunds", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getAllByText(/Gifts4You is operated by Nicholas Daniel/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Nicholas Daniel, operating as Gifts4You/).length).toBeGreaterThanOrEqual(1);
    expect(CONTACT_EMAIL).toBe("gifts4youapp@gifts4you.app");
    expect(screen.getAllByRole("link", { name: CONTACT_EMAIL }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("heading", { name: "$0.99 one-time" })).toBeInTheDocument();
    expect(screen.getAllByText(/does not renew, and you will not be charged again/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "$6.99 every 6 months" })).toBeInTheDocument();
    expect(screen.getAllByText(/renews automatically every 6 months/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "$12.99 yearly" })).toBeInTheDocument();
    expect(screen.getAllByText(/renews automatically every year/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/We'll email you before your plan renews/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/All sales are final/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/except where required by law/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /manage or cancel subscription/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/not for children under 13/i)).toBeInTheDocument();
    expect(screen.getByText(/18 or older/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/nkd23@comcast\.net/i);
  });

  it("redirects the short terms addresses to /terms", async () => {
    await expect(nextConfig.redirects?.()).resolves.toEqual([
      { source: "/terms-of-service", destination: "/terms", permanent: true },
      { source: "/tos", destination: "/terms", permanent: true },
    ]);
  });
});
