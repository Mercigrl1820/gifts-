/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
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

import { POST } from "../src/app/api/generate/route";
import { idea } from "./fixtures";

function request(body: unknown) {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    delete process.env.OPENAI_API_KEY;
  });

  it("does not call the model for invalid JSON or invalid fields", async () => {
    const invalidJson = await POST(request("{"));
    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toEqual({ error: "Invalid JSON body" });

    const invalidBody = await POST(
      request({ occasion: "Birthday", relationship: "Friend", excludeTitles: "Mug" })
    );
    expect(invalidBody.status).toBe(400);
    const invalidPayload = await invalidBody.json();
    expect(invalidPayload.error).toBe("excludeTitles must be an array of strings");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("uses the existing model settings and returns five ideas without a live API call", async () => {
    const ideas = [
      idea("Cozy Blanket"),
      idea("Trail Map"),
      idea("Pour-Over Kettle"),
      idea("Café Mug"),
      idea("Board Game Night"),
    ];
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ ideas }) } }],
    });

    const response = await POST(
      request({
        occasion: "Birthday",
        relationship: "Friend",
        interests: "hiking and coffee",
        recipientName: "Sarah",
        count: 20,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ideas });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        temperature: 0.8,
        response_format: { type: "json_object" },
      })
    );
    const prompt = mocks.create.mock.calls[0][0].messages[1].content as string;
    expect(prompt).toContain("Generate 5 personalized gift ideas");
    expect(prompt).toContain("hiking and coffee");
    expect(prompt).not.toContain("Generate 20");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("asks for five more ideas while excluding titles the caller already has", async () => {
    mocks.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ideas: [idea("cozy blanket!"), idea("Star Chart")],
            }),
          },
        },
      ],
    });

    const response = await POST(
      request({
        occasion: "Birthday",
        relationship: "Friend",
        interests: "hiking and coffee",
        dislikedIdeas: ["Scented Candle"],
        excludeTitles: ["Cozy Blanket"],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ideas: [idea("Star Chart")] });
    const prompt = mocks.create.mock.calls[0][0].messages[1].content as string;
    expect(prompt).toContain("Generate 5 personalized gift ideas");
    expect(prompt).toContain("Scented Candle");
    expect(prompt).toContain("Cozy Blanket");
    expect(mocks.create.mock.calls[0][0].messages[0].content).toBe(
      "You are a helpful gift recommendation assistant. Always respond with valid JSON only."
    );
  });
});
