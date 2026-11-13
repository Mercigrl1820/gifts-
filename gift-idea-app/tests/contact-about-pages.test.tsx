/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutPage from "../src/app/about/page";
import ContactPage from "../src/app/contact/page";
import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
} from "../src/lib/affiliate-disclosure";
import { CONTACT_EMAIL } from "../src/lib/site";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("Contact and About", () => {
  afterEach(() => {
    cleanup();
  });

  it("publishes one support address on the contact page", () => {
    render(<ContactPage />);

    expect(CONTACT_EMAIL).toBe("gifts4youapp@gifts4you.app");
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByText(/billing, subscription questions, cancellations, or a privacy request/i)).toBeInTheDocument();
    const emailLinks = screen.getAllByRole("link", { name: CONTACT_EMAIL });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of emailLinks) {
      expect(link).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    }
    expect(screen.getByText(/cancel a subscription anytime online/i)).toBeInTheDocument();
    expect(screen.getByText(/stripe customer portal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage or cancel subscription/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(document.body.textContent).not.toMatch(/nkd23@comcast\.net/i);
    expect(document.body.textContent).not.toMatch(/hellogifts4youapp/i);
    expect(document.body.textContent).not.toMatch(/hello@gifts4you\.app/i);
  });

  it("states who operates Gifts4You and that some links are affiliate links", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByText(/helps people find gift ideas fast/i)).toBeInTheDocument();
    expect(screen.getByText(/Nicholas Daniel, a sole proprietor based in Georgia, United States/i)).toBeInTheDocument();
    expect(screen.getByText(/Amazon Associates and other partners/i)).toBeInTheDocument();
    expect(screen.getAllByText(GENERAL_AFFILIATE_DISCLOSURE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(AMAZON_ASSOCIATES_DISCLOSURE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getAllByRole("link", { name: CONTACT_EMAIL }).length).toBeGreaterThanOrEqual(1);
    expect(document.body.textContent).not.toMatch(/nkd23@comcast\.net/i);
    expect(document.body.textContent).not.toMatch(/testimonial|our team|million/i);
  });
});
