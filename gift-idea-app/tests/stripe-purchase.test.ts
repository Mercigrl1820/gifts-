/**
 * @vitest-environment node
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memorySearchStore } from "./memory-search-store";

const mocks = vi.hoisted(() => ({
  store: null as ReturnType<typeof memorySearchStore>["store"] | null,
  track: vi.fn(),
}));

vi.mock("@/lib/search-limit-store", () => ({
  createSearchLimitStore: () => mocks.store,
}));

vi.mock("@vercel/analytics/server", () => ({
  track: mocks.track,
}));

import { POST as confirm } from "../src/app/api/billing/confirm/route";
import { POST as webhook } from "../src/app/api/stripe/webhook/route";
import { STRIPE_SECRET_KEY_ENV, STRIPE_WEBHOOK_SECRET_ENV } from "../src/lib/stripe-env";
import { verifyStripeSignature } from "../src/lib/stripe-signature";
import { signVisitorCookie } from "../src/lib/visitor-cookie";
import { VISITOR_COOKIE_SECRET_ENV } from "../src/lib/search-limit-config";

const SECRET = "test-cookie-secret-value";
const WEBHOOK_SECRET = "whsec_test_secret";
const CONTACT = "buyer@example.com";

function stripeHeader(payload: string, secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return { header: `t=${timestamp},v1=${signature}`, timestamp };
}

describe("Stripe purchase hook", () => {
  beforeEach(() => {
    mocks.track.mockReset();
    mocks.store = memorySearchStore().store;
    vi.stubEnv(VISITOR_COOKIE_SECRET_ENV, SECRET);
    vi.stubEnv(STRIPE_WEBHOOK_SECRET_ENV, WEBHOOK_SECRET);
    vi.stubEnv(STRIPE_SECRET_KEY_ENV, "sk_test_placeholder");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a bad signature and stores paid status for a signed checkout", async () => {
    const visitorId = crypto.randomUUID();
    const payload = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: {
        object: {
          object: "checkout.session",
          id: "cs_test_abc1234567",
          payment_status: "paid",
          client_reference_id: visitorId,
          customer_email: CONTACT,
        },
      },
    });
    const { header, timestamp } = stripeHeader(payload);
    expect(verifyStripeSignature(payload, header, WEBHOOK_SECRET, timestamp * 1000)).toBe(true);
    expect(verifyStripeSignature(`${payload} `, header, WEBHOOK_SECRET, timestamp * 1000)).toBe(false);
    expect(verifyStripeSignature(payload, header, WEBHOOK_SECRET, timestamp * 1000 + 600_000)).toBe(false);

    const rejected = await webhook(
      new Request("https://preview.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=deadbeef" },
        body: payload,
      }),
    );
    expect(rejected.status).toBe(400);
    expect(JSON.stringify(await rejected.json())).not.toContain(CONTACT);

    const accepted = await webhook(
      new Request("https://preview.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": header },
        body: payload,
      }),
    );
    expect(accepted.status).toBe(200);
    const acceptedBody = await accepted.json();
    expect(acceptedBody).toEqual({ received: true });
    expect(JSON.stringify(acceptedBody)).not.toContain(CONTACT);
    expect(await mocks.store!.isUnlimited(visitorId)).toBe(true);
    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith("purchase", { source: "stripe" }, expect.anything());
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain(CONTACT);

    const again = await webhook(
      new Request("https://preview.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": header },
        body: payload,
      }),
    );
    expect(again.status).toBe(200);
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it("keeps subscription access through the paid period and drops it after that period ends", async () => {
    const visitorId = crypto.randomUUID();
    const future = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const past = Math.floor(Date.now() / 1000) - 60;
    const opened = JSON.stringify({
      id: "evt_sub",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_sub1234567",
          payment_status: "paid",
          mode: "subscription",
          client_reference_id: visitorId,
          customer: "cus_test12345678",
          subscription: {
            id: "sub_test12345678",
            customer: "cus_test12345678",
            status: "active",
            current_period_end: future,
            cancel_at_period_end: false,
          },
        },
      },
    });
    const openedHeader = stripeHeader(opened).header;
    const accepted = await webhook(
      new Request("https://preview.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": openedHeader },
        body: opened,
      }),
    );
    expect(accepted.status).toBe(200);
    expect(await mocks.store!.isUnlimited(visitorId)).toBe(true);
    expect(await mocks.store!.readBillingCustomer(visitorId)).toBe("cus_test12345678");

    const canceled = JSON.stringify({
      id: "evt_cancel",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test12345678",
          customer: "cus_test12345678",
          status: "canceled",
          current_period_end: future,
          cancel_at_period_end: true,
        },
      },
    });
    const canceledHeader = stripeHeader(canceled).header;
    expect(
      (
        await webhook(
          new Request("https://preview.example/api/stripe/webhook", {
            method: "POST",
            headers: { "stripe-signature": canceledHeader },
            body: canceled,
          }),
        )
      ).status,
    ).toBe(200);
    expect(await mocks.store!.isUnlimited(visitorId)).toBe(true);

    const ended = JSON.stringify({
      id: "evt_ended",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_test12345678",
          customer: "cus_test12345678",
          status: "canceled",
          current_period_end: past,
          cancel_at_period_end: true,
        },
      },
    });
    const endedHeader = stripeHeader(ended).header;
    expect(
      (
        await webhook(
          new Request("https://preview.example/api/stripe/webhook", {
            method: "POST",
            headers: { "stripe-signature": endedHeader },
            body: ended,
          }),
        )
      ).status,
    ).toBe(200);
    expect(await mocks.store!.isUnlimited(visitorId)).toBe(false);
  });

  it("confirms a paid session only for the signed visitor cookie", async () => {
    const visitorId = crypto.randomUUID();
    const otherId = crypto.randomUUID();
    const sessionId = "cs_test_return1234";
    const signed = await signVisitorCookie(visitorId, SECRET);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: sessionId,
            payment_status: "paid",
            client_reference_id: visitorId,
            customer_email: CONTACT,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const response = await confirm(
      new Request("https://preview.example/api/billing/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `gift_visitor=${encodeURIComponent(signed)}`,
        },
        body: JSON.stringify({ sessionId }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ paid: true });
    expect(await mocks.store!.isUnlimited(visitorId)).toBe(true);
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain(CONTACT);

    const mismatch = await confirm(
      new Request("https://preview.example/api/billing/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `gift_visitor=${encodeURIComponent(await signVisitorCookie(otherId, SECRET))}`,
        },
        body: JSON.stringify({ sessionId }),
      }),
    );
    await expect(mismatch.json()).resolves.toEqual({ paid: false });
    expect(await mocks.store!.isUnlimited(otherId)).toBe(false);
  });

  it("fails closed for purchases when Stripe is not configured and does not throw", async () => {
    vi.stubEnv(STRIPE_WEBHOOK_SECRET_ENV, "");
    vi.stubEnv(STRIPE_SECRET_KEY_ENV, "");
    const pending = await webhook(
      new Request("https://preview.example/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(pending.status).toBe(503);

    const confirmResponse = await confirm(
      new Request("https://preview.example/api/billing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_test_unconfigured1" }),
      }),
    );
    expect(confirmResponse.status).toBe(200);
    await expect(confirmResponse.json()).resolves.toEqual({ paid: false });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
