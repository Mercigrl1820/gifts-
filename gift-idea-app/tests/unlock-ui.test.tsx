/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";
import { jsonResponse } from "./fixtures";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fetchMock = vi.fn();
const alertMock = vi.fn();

describe("Unlock codes and recipient form", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    alertMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("alert", alertMock);
    vi.stubGlobal("fetch", fetchMock);
  });

  it("does not render the street address field", async () => {
    render(<Home />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /start finding gifts/i }));

    expect(screen.queryByText(/address \(optional\)/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/street, city, state, zip/i)).not.toBeInTheDocument();
    expect(screen.getByText(/birthday \(optional\)/i)).toBeInTheDocument();
  });

  it("loads a previously saved profile without restoring a street address", async () => {
    localStorage.setItem(
      "giftidea_profiles",
      JSON.stringify([
        {
          id: "p1",
          name: "Sarah",
          occasion: "Birthday",
          relationship: "Friend",
          ageRange: "25-34",
          interests: "hiking",
          personality: "warm",
          budget: "$25 – $50",
          avoid: "",
          extraNotes: "",
          address: "123 Main Street",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ])
    );

    render(<Home />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /saved \(1\)/i }));
    await user.click(screen.getByRole("button", { name: /sarah/i }));

    expect(screen.getByDisplayValue("Sarah")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("123 Main Street")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/street, city, state, zip/i)).not.toBeInTheDocument();
  });

  it("applies the server unlock result and keeps the existing plan message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true, profileLimit: 5 }));
    render(<Home />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Enter code"), "fresh-advanced");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        "Advanced plan unlocked — you can now save up to 5 profiles."
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/unlock",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "fresh-advanced" }),
      })
    );
    expect(localStorage.getItem("gift-limit")).toBe("5");
    expect(screen.getByPlaceholderText("Enter code")).toHaveValue("");
  });

  it("does not unlock a code the server rejects", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: false }));
    render(<Home />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Enter code"), "BASIC2");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Invalid code. Please check and try again.");
    });
    expect(localStorage.getItem("gift-limit")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
