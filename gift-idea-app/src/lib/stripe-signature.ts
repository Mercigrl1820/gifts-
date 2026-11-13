import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

/**
 * Stripe-Signature check for webhook bodies.
 * https://docs.stripe.com/webhooks#verify-official-libraries
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!header || !secret) return false;

  let timestamp = "";
  const signatures: string[] = [];
  for (const item of header.split(",")) {
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1" && value) signatures.push(value);
  }

  if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const ageSeconds = Math.abs(nowMs / 1000 - Number(timestamp));
  if (ageSeconds > TOLERANCE_SECONDS) return false;

  const expectedHex = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  const expected = Buffer.from(expectedHex, "utf8");
  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
