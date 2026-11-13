export const CUSTOMER_ID_PATTERN = /^cus_[A-Za-z0-9]{8,64}$/;
export const SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]{8,64}$/;

/** Time we still allow an active plan after the stored period end, so a late renewal webhook does not cut off a paying visitor. */
export const SUBSCRIPTION_RENEWAL_GRACE_SECONDS = 3 * 24 * 60 * 60;

const CONTINUING_STATUSES = new Set(["active", "trialing", "past_due"]);

export type SubscriptionSnapshot = {
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
};

export function readCustomerId(value: unknown): string | null {
  if (typeof value === "string" && CUSTOMER_ID_PATTERN.test(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && CUSTOMER_ID_PATTERN.test(id)) return id;
  }
  return null;
}

function readPeriodEnd(record: Record<string, unknown>): number | null {
  if (typeof record.current_period_end === "number" && Number.isFinite(record.current_period_end)) {
    return record.current_period_end;
  }
  const items = record.items;
  if (!items || typeof items !== "object" || !("data" in items)) return null;
  const data = (items as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const end = (item as { current_period_end?: unknown }).current_period_end;
    if (typeof end === "number" && Number.isFinite(end)) return end;
  }
  return null;
}

/** Read a Stripe subscription object. Accepts current_period_end on the subscription or on the first item. */
export function readSubscriptionSnapshot(value: unknown): SubscriptionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const subscriptionId = typeof record.id === "string" ? record.id : "";
  const customerId = readCustomerId(record.customer);
  const status = typeof record.status === "string" ? record.status : "";
  if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId) || !customerId || !/^[a-z_]{1,40}$/.test(status)) {
    return null;
  }
  return {
    customerId,
    subscriptionId,
    status,
    currentPeriodEnd: readPeriodEnd(record),
    cancelAtPeriodEnd: record.cancel_at_period_end === true,
  };
}

/** Read the record this app stores in Redis. */
export function coerceSubscriptionSnapshot(value: unknown): SubscriptionSnapshot | null {
  const source = typeof value === "string" ? parseJson(value) : value;
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const customerId = typeof record.customerId === "string" ? record.customerId : "";
  const subscriptionId = typeof record.subscriptionId === "string" ? record.subscriptionId : "";
  const status = typeof record.status === "string" ? record.status : "";
  if (!CUSTOMER_ID_PATTERN.test(customerId) || !SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) return null;
  if (!/^[a-z_]{1,40}$/.test(status)) return null;
  const end = record.currentPeriodEnd;
  return {
    customerId,
    subscriptionId,
    status,
    currentPeriodEnd: typeof end === "number" && Number.isFinite(end) ? end : null,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd === true,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/**
 * A renewing plan stays on through the paid period, including after the shopper cancels.
 * A canceled plan with no known period end does not grant access.
 * An active plan with no known end still grants access until a later Stripe event fills the date in.
 */
export function subscriptionGrantsAccess(snapshot: SubscriptionSnapshot, nowSeconds: number): boolean {
  const end = snapshot.currentPeriodEnd;
  if (snapshot.status === "canceled") {
    return typeof end === "number" && nowSeconds < end;
  }
  if (!CONTINUING_STATUSES.has(snapshot.status)) return false;
  if (end === null) return true;
  if (nowSeconds < end) return true;
  if (snapshot.cancelAtPeriodEnd) return false;
  return nowSeconds < end + SUBSCRIPTION_RENEWAL_GRACE_SECONDS;
}
