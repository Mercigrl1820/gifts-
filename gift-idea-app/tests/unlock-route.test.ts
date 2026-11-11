/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/unlock/route";
import { UNLOCK_CODES_ENV } from "../src/lib/unlock";

const CONFIGURED_CODES = "fresh-basic:2, fresh-advanced:5, fresh-pro:999";

function request(body: unknown) {
  return new Request("http://localhost/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/unlock", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env[UNLOCK_CODES_ENV];
  });

  it("accepts a configured code and returns only the matching profile limit", async () => {
    vi.stubEnv(UNLOCK_CODES_ENV, CONFIGURED_CODES);

    const cases = [
      { code: "  fresh-basic  ", profileLimit: 2 },
      { code: "FRESH-ADVANCED", profileLimit: 5 },
      { code: "fresh-pro", profileLimit: 999 },
    ];

    for (const entry of cases) {
      const response = await POST(request({ code: entry.code }));
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toEqual({ ok: true, profileLimit: entry.profileLimit });
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain("fresh-basic");
      expect(serialized).not.toContain("fresh-advanced");
      expect(serialized).not.toContain("fresh-pro");
      expect(serialized).not.toContain(UNLOCK_CODES_ENV);
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid code without revealing configured codes", async () => {
    vi.stubEnv(UNLOCK_CODES_ENV, CONFIGURED_CODES);

    const response = await POST(request({ code: "BASIC2" }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ ok: false });
    expect(JSON.stringify(payload)).not.toContain("fresh-basic");
    expect(JSON.stringify(payload)).not.toContain("999");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the unlock env var is unset", async () => {
    expect(process.env[UNLOCK_CODES_ENV]).toBeUndefined();

    const response = await POST(request({ code: "fresh-basic" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("fails closed when the env var is empty or has no usable codes", async () => {
    for (const value of ["", "   ", ",", "not-a-code", ":2", "code:0", "code:1000"]) {
      vi.stubEnv(UNLOCK_CODES_ENV, value);
      const response = await POST(request({ code: "code" }));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: false });
    }
  });
});
