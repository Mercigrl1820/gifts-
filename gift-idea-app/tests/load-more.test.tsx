/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/app/page";
import { deferred, idea, jsonResponse } from "./fixtures";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/script", () => ({
  default: () => null,
}));

const fetchMock = vi.fn();

const initialIdeas = [
  idea("Cozy Blanket"),
  idea("Trail Map"),
  idea("Pour-Over Kettle"),
  idea("Café Mug"),
  idea("Board Game Night"),
];

function titlesOnScreen() {
  return screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
}

function requestBody(callIndex: number) {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

async function startSearch(interests = "hiking and coffee") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /start finding gifts/i }));
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Birthday" } });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Friend" } });
  fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "Female" } });
  fireEvent.change(screen.getAllByRole("combobox")[3], { target: { value: "25-34" } });
  fireEvent.change(screen.getAllByRole("combobox")[4], { target: { value: "$25 – $50" } });
  fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sarah/i), { target: { value: "Sarah" } });
  fireEvent.change(screen.getByPlaceholderText(/loves cooking/i), { target: { value: interests } });
  fireEvent.change(screen.getByPlaceholderText(/practical, sentimental/i), {
    target: { value: "adventurous" },
  });
  fireEvent.change(screen.getByPlaceholderText(/no clothes/i), { target: { value: "no socks" } });
  fireEvent.change(screen.getByPlaceholderText(/Recent life events/i), {
    target: { value: "training for a hike" },
  });
  const date = document.querySelector('input[type="date"]');
  if (!date) throw new Error("Missing birthday field");
  fireEvent.change(date, { target: { value: "1990-05-01" } });
  await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));
  return user;
}

describe("Load more gifts", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "giftidea_profiles",
      JSON.stringify([
        {
          id: "p1",
          name: "Sarah",
          occasion: "Birthday",
          relationship: "Friend",
          ageRange: "25-34",
          interests: "stored interest",
          personality: "warm",
          budget: "$25 – $50",
          avoid: "stored avoid",
          extraNotes: "stored note",
          createdAt: "2026-01-01T00:00:00.000Z",
          dislikedIdeas: ["Scented Candle"],
          likedIdeas: [],
        },
      ])
    );
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => {
      throw new Error("Unexpected generate request");
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("preserves the initial five gifts and sends the original preferences without exclusions", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }));
    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();
    expect(titlesOnScreen()).toEqual(initialIdeas.map((entry) => entry.title));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/generate");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(requestBody(0)).toEqual({
      occasion: "Birthday",
      relationship: "Friend",
      ageRange: "25-34",
      gender: "Female",
      birthday: "1990-05-01",
      interests: "hiking and coffee",
      personality: "adventurous",
      budget: "$25 – $50",
      avoid: "no socks",
      extraNotes: "training for a hike",
      recipientName: "Sarah",
      dislikedIdeas: ["Scented Candle"],
    });
    expect(screen.getByRole("button", { name: /load more gifts/i })).toBeEnabled();
  });

  it("requests five more ideas with the same context and excludes every current title", async () => {
    const moreIdeas = [
      idea("Star Chart"),
      idea("Picnic Basket"),
      idea("Handwritten Recipe Book"),
      idea("National Park Pass"),
      idea("Wool Hiking Socks"),
    ];
    const thirdWave = [idea("Compass"), idea("Camp Mug"), idea("Field Journal"), idea("Thermos"), idea("Lantern")];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }))
      .mockResolvedValueOnce(jsonResponse({ ideas: moreIdeas }))
      .mockResolvedValueOnce(jsonResponse({ ideas: thirdWave }));

    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    await screen.findByRole("heading", { name: "Board Game Night" });

    await user.click(screen.getByRole("button", { name: /load more gifts/i }));
    expect(await screen.findByRole("heading", { name: "Star Chart" })).toBeInTheDocument();
    expect(titlesOnScreen()).toEqual([...initialIdeas, ...moreIdeas].map((entry) => entry.title));

    const loadMoreBody = requestBody(1);
    expect(loadMoreBody).toMatchObject({
      occasion: "Birthday",
      relationship: "Friend",
      ageRange: "25-34",
      gender: "Female",
      birthday: "1990-05-01",
      interests: "hiking and coffee",
      personality: "adventurous",
      budget: "$25 – $50",
      avoid: "no socks",
      extraNotes: "training for a hike",
      recipientName: "Sarah",
      dislikedIdeas: ["Scented Candle"],
    });
    expect(loadMoreBody.excludeTitles).toEqual(initialIdeas.map((entry) => entry.title));
    expect(loadMoreBody.address).toBeUndefined();

    await user.click(screen.getByRole("button", { name: /load more gifts/i }));
    expect(await screen.findByRole("heading", { name: "Compass" })).toBeInTheDocument();
    expect(requestBody(2).excludeTitles).toEqual(
      [...initialIdeas, ...moreIdeas].map((entry) => entry.title)
    );
    expect(requestBody(2).interests).toBe("hiking and coffee");
    expect(titlesOnScreen()).toHaveLength(15);
  });

  it("appends load-more results with normalized title dedupe and keeps the original cards", async () => {
    const moreIdeas = [
      idea("cozy   blanket!"),
      idea("cafe mug"),
      idea("Star Chart"),
      idea("Picnic Basket"),
      idea("STAR   chart"),
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }))
      .mockResolvedValueOnce(jsonResponse({ ideas: moreIdeas }));

    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    await screen.findByRole("heading", { name: "Café Mug" });
    await user.click(screen.getByRole("button", { name: /load more gifts/i }));

    expect(await screen.findByRole("heading", { name: "Star Chart" })).toBeInTheDocument();
    expect(titlesOnScreen()).toEqual([
      "Cozy Blanket",
      "Trail Map",
      "Pour-Over Kettle",
      "Café Mug",
      "Board Game Night",
      "Star Chart",
      "Picnic Basket",
    ]);
    expect(screen.getByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "cozy   blanket!" })).not.toBeInTheDocument();
  });

  it("ignores a repeat click while load more is in flight and leaves the current cards visible", async () => {
    const pending = deferred<Response>();
    const moreIdeas = [
      idea("Star Chart"),
      idea("Picnic Basket"),
      idea("Handwritten Recipe Book"),
      idea("National Park Pass"),
      idea("Wool Hiking Socks"),
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }))
      .mockImplementationOnce(() => pending.promise);

    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    await screen.findByRole("heading", { name: "Cozy Blanket" });

    const button = screen.getByRole("button", { name: /load more gifts/i });
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /loading more gifts/i })).toBeDisabled();
    expect(titlesOnScreen()).toEqual(initialIdeas.map((entry) => entry.title));

    await act(async () => {
      pending.resolve(jsonResponse({ ideas: moreIdeas }));
      await pending.promise;
    });

    expect(await screen.findByRole("heading", { name: "Wool Hiking Socks" })).toBeInTheDocument();
    expect(titlesOnScreen()).toHaveLength(10);
    expect(screen.getByRole("button", { name: /load more gifts/i })).toBeEnabled();
  });

  it("keeps the current cards on a load-more error and lets the same search be retried", async () => {
    const moreIdeas = [
      idea("Star Chart"),
      idea("Picnic Basket"),
      idea("Handwritten Recipe Book"),
      idea("National Park Pass"),
      idea("Wool Hiking Socks"),
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }))
      .mockResolvedValueOnce(jsonResponse({ error: "The model is busy" }, 500))
      .mockResolvedValueOnce(jsonResponse({ ideas: moreIdeas }));

    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    await screen.findByRole("heading", { name: "Trail Map" });

    await user.click(screen.getByRole("button", { name: /load more gifts/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The model is busy");
    expect(titlesOnScreen()).toEqual(initialIdeas.map((entry) => entry.title));
    const retryButton = screen.getByRole("button", { name: /load more gifts/i });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);
    expect(await screen.findByRole("heading", { name: "Star Chart" })).toBeInTheDocument();
    expect(titlesOnScreen()).toHaveLength(10);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requestBody(2).excludeTitles).toEqual(initialIdeas.map((entry) => entry.title));
    expect(requestBody(2).interests).toBe("hiking and coffee");
  });

  it("resets for a new search and ignores a stale load-more response", async () => {
    const pending = deferred<Response>();
    const freshIdeas = [
      idea("Fresh Compass"),
      idea("Fresh Journal"),
      idea("Fresh Thermos"),
      idea("Fresh Lantern"),
      idea("Fresh Cocoa"),
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas }))
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValueOnce(jsonResponse({ ideas: freshIdeas }));

    render(<Home />);
    const user = await startSearch("hiking and coffee");
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    await screen.findByRole("heading", { name: "Pour-Over Kettle" });

    const loadMore = screen.getByRole("button", { name: /load more gifts/i });
    await user.click(loadMore);
    expect(screen.getByRole("button", { name: /loading more gifts/i })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Cozy Blanket" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start a new search/i }));
    expect(screen.queryByRole("heading", { name: "Cozy Blanket" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "Christmas" } });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "Parent" } });
    fireEvent.change(screen.getByPlaceholderText(/loves cooking/i), {
      target: { value: "baking bread" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sarah/i), { target: { value: "Alex" } });
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));

    expect(await screen.findByRole("heading", { name: "Fresh Compass" })).toBeInTheDocument();
    expect(titlesOnScreen()).toEqual(freshIdeas.map((entry) => entry.title));
    expect(requestBody(2)).toMatchObject({
      occasion: "Christmas",
      relationship: "Parent",
      interests: "baking bread",
      recipientName: "Alex",
      dislikedIdeas: [],
    });
    expect(requestBody(2).excludeTitles).toBeUndefined();

    await act(async () => {
      pending.resolve(
        jsonResponse({
          ideas: [idea("Stale Extra"), idea("Stale Scarf"), idea("Stale Book"), idea("Stale Candle"), idea("Stale Plant")],
        })
      );
      await pending.promise;
    });

    expect(screen.queryByRole("heading", { name: "Stale Extra" })).not.toBeInTheDocument();
    expect(titlesOnScreen()).toEqual(freshIdeas.map((entry) => entry.title));

    const freshMore = [idea("New Apron"), idea("New Whisk"), idea("New Scale"), idea("New Timer"), idea("New Spice Set")];
    fetchMock.mockResolvedValueOnce(jsonResponse({ ideas: freshMore }));
    await user.click(screen.getByRole("button", { name: /load more gifts/i }));
    expect(await screen.findByRole("heading", { name: "New Apron" })).toBeInTheDocument();
    expect(requestBody(3).excludeTitles).toEqual(freshIdeas.map((entry) => entry.title));
    expect(requestBody(3).interests).toBe("baking bread");
    expect(requestBody(3).occasion).toBe("Christmas");
    expect(screen.queryByRole("heading", { name: "Cozy Blanket" })).not.toBeInTheDocument();
  });
});

describe("gift card list", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("keeps every initial card mounted while a later page is loading", async () => {
    const pending = deferred<Response>();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ideas: initialIdeas })).mockImplementationOnce(() => pending.promise);
    render(<Home />);
    const user = await startSearch();
    await user.click(screen.getByRole("button", { name: /get gift ideas/i }));
    const firstCard = await screen.findByRole("heading", { name: "Cozy Blanket" });
    await user.click(screen.getByRole("button", { name: /load more gifts/i }));

    expect(firstCard).toBeInTheDocument();
    const list = firstCard.closest(".space-y-5");
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });
});
