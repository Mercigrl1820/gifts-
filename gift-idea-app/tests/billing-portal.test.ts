/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memorySearchStore } from "./memory-search-store";

const mocks = vi.hoisted(() => ({
  store: null as ReturnType<typeof memorySearchStore>["store"] | null,
}));

vi.mock("@/lib/search-limit-store", () => ({
  createSearchLimitStore: () => mocks.store,
}));

import { POST } from "../src/app/api/billing/portal/route";
import { VISITOR_COOKIE_SECRET_ENV } from "../src/lib/search-limit-config";
import { CONTACT_EMAIL } from "../src/lib/site";
import { STRIPE_SECRET_KEY_ENV } from "../src/lib/stripe-env";
import { signVisitorCookie } from "../src/lib/visitor-cookie";

const SECRET = "test-cookie-secret-value";

describe("POST /api/billing/portal", () => {
  beforeEach(() => {
    mocks.store = memorySearchStore().store;
    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, SECRET);
    vi.stubEnv(STRIPE_SECRET_KEY_ENV, "sk_test_placeholder");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("opens a Stripe billing portal session for the visitor saved at checkout", async () => {
    const visitorId = crypto.randomUUID();
    await mocks.store!.saveBillingCustomer(visitorId, "cus_portal123456");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: "https://billing.stripe.com/p/session/test_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const cookie = await signVisitorCookie(visitorId, SECRET);

    const response = await POST(
      new Request("https://preview.example/api/billing/portal", {
        method: "POST",
        headers: { cookie: `gift_visitor=${encodeURIComponent(cookie)}` },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      url: "https://billing.stripe.com/p/session/test_123",
    });
    expect(JSON.stringify(body)).not.toContain("sk_test_placeholder");
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(String(init.body)).toContain("customer=cus_portal123456");
    expect(String(init.headers && (init.headers as Record<string, string>).Authorization)).toContain(
      "sk_test_placeholder",
    );
  });

  it("does not leak a Stripe error and tells the shopper to email when the portal cannot open", async () => {
    const visitorId = crypto.randomUUID();
    await mocks.store!.saveBillingCustomer(visitorId, "cus_portal123456");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: "portal disabled sk_live_secret" } }), { status: 400 }),
      ),
    );
    const cookie = await signVisitorCookie(visitorId, SECRET);
    const response = await POST(
      new Request("https://preview.example/api/billing/portal", {
        method: "POST",
        headers: { cookie: `gift_visitor=${encodeURIComponent(cookie)}` },
      }),
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain(CONTACT_EMAIL);
    expect(JSON.stringify(body)).not.toMatch(/sk_live_secret|portal disabled/);
  });

  it("explains how to cancel by email when this browser has no Stripe customer", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(new Request("https://preview.example/api/billing/portal", { method: "POST" }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining(CONTACT_EMAIL),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
