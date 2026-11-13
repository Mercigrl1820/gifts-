/**
 * Plan copy follows the owner's description of the three Stripe plans.
 * The live pricing table (prctbl_1UXXKEIAYv4F4L27F0BTqq2f) agrees on $0.99
 * one-time (price_1UXW9zIAYv4F4L27K7eEucBj) and $12.99 yearly
 * (price_1UXWPXIAYv4F4L27AHkB7buS, interval year, interval_count 1).
 * It does NOT agree on $6.99: price_1UXWPXIAYv4F4L275JgmgR5P is interval
 * "month" with interval_count 1 (about 31 days), not every 6 months.
 * This copy uses the owner's 6-month period. Stripe Checkout will show the
 * price's own interval until that price is changed in the Stripe dashboard.
 */

export const REFUND_TERMS =
  "All sales are final. We do not offer refunds, except where required by law.";

export const RENEWAL_EMAIL = "We'll email you before your plan renews.";

export const ONE_TIME_DISCLOSURE = `The $0.99 plan is a one-time purchase. It does not renew, and you will not be charged again. ${REFUND_TERMS}`;

export const SIX_MONTH_DISCLOSURE = `The $6.99 plan costs $6.99 and renews automatically every 6 months until you cancel. ${RENEWAL_EMAIL} You can cancel online at any time with Manage or cancel subscription on this site, or from the link in your Stripe receipt. You do not have to call. Canceling stops future renewals. You keep access until the end of the 6-month period you already paid for. ${REFUND_TERMS}`;

export const YEARLY_DISCLOSURE = `The $12.99 plan costs $12.99 and renews automatically every year until you cancel. ${RENEWAL_EMAIL} You can cancel online at any time with Manage or cancel subscription on this site, or from the link in your Stripe receipt. You do not have to call. Canceling stops future renewals. You keep access until the end of the year you already paid for. ${REFUND_TERMS}`;

export const PLAN_DISCLOSURES = [
  { title: "$0.99 one-time", body: ONE_TIME_DISCLOSURE },
  { title: "$6.99 every 6 months", body: SIX_MONTH_DISCLOSURE },
  { title: "$12.99 yearly", body: YEARLY_DISCLOSURE },
] as const;

export const WHAT_IS_SOLD =
  "A paid plan removes the free gift-search limit for the browser you use to pay. The free plan includes 2 gift searches, and that count does not reset. Saved profiles stay on your device. The free plan saves 1 profile. An unlock code can raise that number. Paying does not raise the number of saved profiles. Gifts4You does not sell the gifts themselves. Store buttons open a retailer's website.";

export const PURCHASE_ACKNOWLEDGMENT =
  "Payment received. The $0.99 plan is a one-time purchase and does not renew. The $6.99 plan renews every 6 months, and the $12.99 plan renews every year, until you cancel. We'll email you before a renewing plan renews. Cancel online with Manage or cancel subscription. You keep access until the end of the period you already paid for.";
