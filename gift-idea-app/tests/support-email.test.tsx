/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutPage from "../src/app/about/page";
import ContactPage from "../src/app/contact/page";
import Home from "../src/app/page";
import PrivacyPage from "../src/app/privacy/page";
import TermsPage from "../src/app/terms/page";
import { SUPPORT_EMAIL } from "../src/lib/site";

const RETIRED_EMAIL = "hello@gifts4you.app";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const pages = [
  ["home", Home],
  ["privacy", PrivacyPage],
  ["terms", TermsPage],
  ["contact", ContactPage],
  ["about", AboutPage],
] as const;

describe("Support email", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses one support address and does not render the retired mailbox", () => {
    expect(SUPPORT_EMAIL).toBe("gifts4youapp@gifts4you.app");
    expect(SUPPORT_EMAIL).not.toBe(RETIRED_EMAIL);

    for (const [name, Page] of pages) {
      cleanup();
      render(<Page />);
      expect(document.body.textContent ?? "", name).not.toContain(RETIRED_EMAIL);
      const links = screen.queryAllByRole("link");
      for (const link of links) {
        expect(link.getAttribute("href") ?? "", name).not.toContain(RETIRED_EMAIL);
      }
      expect(screen.getAllByRole("link", { name: SUPPORT_EMAIL }).length, name).toBeGreaterThan(0);
    }
  });
});
