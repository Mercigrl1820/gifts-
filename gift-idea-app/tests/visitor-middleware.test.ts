/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { VISITOR_COOKIE_SECRET_ENV } from "../src/lib/search-limit-config";

const SECRET = "test-cookie-secret-value";

describe("visitor cookie middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets a signed httpOnly cookie on HTTPS and leaves the public id readable", async () => {
    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, SECRET);
    const response = await middleware(new NextRequest("https://preview.example/"));
    const cookies = response.headers.getSetCookie();
    const signed = cookies.find((value) => value.startsWith("gift_visitor="));
    const readable = cookies.find((value) => value.startsWith("gift_vid="));
    expect(signed).toMatch(/HttpOnly/i);
    expect(signed).toMatch(/Secure/i);
    expect(signed).toMatch(/SameSite=Lax/i);
    expect(readable).toBeTruthy();
    expect(readable).not.toMatch(/HttpOnly/i);
  });

  it("does not set a cookie when the secret is missing", async () => {
    const response = await middleware(new NextRequest("https://preview.example/"));
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
