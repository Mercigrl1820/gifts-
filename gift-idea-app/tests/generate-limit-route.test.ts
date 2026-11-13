/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memorySearchStore } from "./memory-search-store";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  store: null as ReturnType<typeof memorySearchStore>["store"] | null,
}));

vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mocks.create,
        },
      };
    },
  };
});

vi.mock("@/lib/search-limit-store", () => ({
  createSearchLimitStore: () => mocks.store,
}));

import { POST as generate } from "../src/app/api/generate/route";
import { POST as unlock } from "../src/app/api/unlock/route";
import { UNLOCK_CODES_ENV } from "../src/lib/unlock";
import { VISITOR_COOKIE_SECRET_ENV } from "../src/lib/search-limit-config";
import { idea } from "./fixtures";

const SECRET = "test-cookie-secret-value";

function generateRequest(body: unknown, cookie?: string) {
  return new Request("https://preview.example/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.40",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function visitorCookie(response: Response): string {
  const header = response.headers.getSetCookie().find((value) => value.startsWith("gift_visitor="));
  if (!header) throw new Error("Missing visitor cookie");
  return header.split(";")[0] ?? "";
}

const search = {
  occasion: "Birthday",
  relationship: "Friend",
  interests: "hiking",
};

describe("POST /api/generate search limit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    mocks.create.mockReset();
    mocks.store = memorySearchStore().store;
    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, SECRET);
    vi.stubEnv("FREE_SEARCH_LIMIT", "2");
    vi.stubEnv("FREE_SEARCH_IP_DAILY_CAP", "20");
    vi.stubEnv("FREE_SEARCH_COUNT_LOAD_MORE", "false");
    delete process.env.OPENAI_API_KEY;
  });

  it("checks the counter before calling the model and returns 402 when the allowance is used", async () => {
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ideas: [idea("Cozy Blanket")] }) } }],
    });

    const first = await generate(generateRequest(search));
    expect(first.status).toBe(200);
    const signed = visitorCookie(first);
    expect(signed.startsWith("gift_visitor=")).toBe(true);
    const signedHeader = first.headers.getSetCookie().find((value) => value.startsWith("gift_visitor=")) ?? "";
    expect(signedHeader).toMatch(/HttpOnly/i);
    expect(signedHeader).toMatch(/Secure/i);
    const publicHeader = first.headers.getSetCookie().find((value) => value.startsWith("gift_vid=")) ?? "";
    expect(publicHeader).not.toMatch(/HttpOnly/i);

    const second = await generate(generateRequest(search, signed));
    expect(second.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(2);

    const third = await generate(generateRequest(search, signed));
    expect(third.status).toBe(402);
    await expect(third.json()).resolves.toEqual({ limitReached: true, limit: 2 });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not count Load more and does not call the model for an invalid body", async () => {
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ideas: [idea("Star Chart")] }) } }],
    });
    const first = await generate(generateRequest(search));
    const signed = visitorCookie(first);
    await generate(generateRequest(search, signed));
    expect(
      (await generate(generateRequest(search, signed))).status,
    ).toBe(402);

    const loadMore = await generate(
      generateRequest({ ...search, excludeTitles: ["Cozy Blanket"] }, signed),
    );
    expect(loadMore.status).toBe(200);
    await expect(loadMore.json()).resolves.toEqual({ ideas: [idea("Star Chart")] });
    expect(mocks.create).toHaveBeenCalledTimes(3);

    const invalid = await generate(generateRequest({ occasion: "Birthday" }, signed));
    expect(invalid.status).toBe(400);
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });

  it("fails closed when the cookie secret or the store is missing", async () => {
    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, "");
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ideas: [idea("Trail Map")] }) } }],
    });

    const response = await generate(generateRequest(search));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Gift search is temporarily unavailable. Please try again later.",
    });
    expect(mocks.create).not.toHaveBeenCalled();

    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, SECRET);
    mocks.store = null;
    const blocked = await generate(generateRequest(search));
    expect(blocked.status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("stores a valid unlock against the visitor and then skips the limit", async () => {
    vi.stubEnv(UNLOCK_CODES_ENV, "fresh-basic:2");
    const memory = memorySearchStore();
    mocks.store = memory.store;
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ideas: [idea("Mug")] }) } }],
    });

    const unlocked = await unlock(
      new Request("https://preview.example/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "fresh-basic" }),
      }),
    );
    expect(unlocked.status).toBe(200);
    await expect(unlocked.json()).resolves.toEqual({ ok: true, profileLimit: 2 });
    const signed = visitorCookie(unlocked);
    expect(memory.unlimited.size).toBe(1);

    await generate(generateRequest(search, signed));
    await generate(generateRequest(search, signed));
    const extra = await generate(generateRequest(search, signed));
    expect(extra.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(3);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
