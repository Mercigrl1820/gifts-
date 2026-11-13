import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { AMAZON_ASSOCIATES_DISCLOSURE } from "@/lib/affiliate-disclosure";
import {
  ONE_TIME_DISCLOSURE,
  PLAN_DISCLOSURES,
  REFUND_TERMS,
  SIX_MONTH_DISCLOSURE,
  WHAT_IS_SOLD,
  YEARLY_DISCLOSURE,
} from "@/lib/plan-terms";
import { SUPPORT_EMAIL, OPERATOR_LEGAL_NAME, OPERATOR_LINE } from "@/lib/site";

export const metadata = {
  title: "Terms of Service – Gifts4You",
  description: "Terms of Service for Gifts4You",
};

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-medium text-violet-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to app
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-2 text-sm text-gray-500">Last updated: November 13, 2026</p>
      <p className="mb-8 text-sm leading-relaxed text-gray-700">
        {OPERATOR_LINE}. These terms are between you and {OPERATOR_LEGAL_NAME}.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Agreement</h2>
          <p>
            By using gifts4you.app or buying a plan, you agree to these terms. If you do not agree, do not use the site or buy a plan.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. What we sell</h2>
          <p>{WHAT_IS_SOLD}</p>
          <p className="mt-2">
            Three plans are offered. The price and whether a plan repeats are shown again on the plan and on the Stripe checkout page before you pay. The Stripe window may still show the name GiftIdea. That charge is from Gifts4You.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. The three plans</h2>
          <div className="mt-3 space-y-3">
            {PLAN_DISCLOSURES.map((plan) => (
              <section key={plan.title} className="rounded-xl border border-gray-200 p-3">
                <h3 className="mb-1 font-semibold text-gray-900">{plan.title}</h3>
                <p>{plan.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Automatic renewal</h2>
          <p>{SIX_MONTH_DISCLOSURE}</p>
          <p className="mt-2">{YEARLY_DISCLOSURE}</p>
          <p className="mt-2">{ONE_TIME_DISCLOSURE}</p>
          <p className="mt-2">
            Renewal charges are taken by Stripe on the card you used, at the price shown when you subscribed, until you cancel. We will email you before a renewing plan renews. Canceling stops the next renewal. It does not refund the period you already paid for, except where required by law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. How to cancel</h2>
          <p>
            You can cancel a renewing plan online, on this website, without calling us. Use Manage or cancel subscription. It is on every page, including this one, and in the upgrade window next to checkout. That opens Stripe&apos;s billing page for the browser you used to pay, where you can cancel. You can also use the link in your Stripe receipt, or email{" "}
            <a className="text-violet-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            and we will cancel the plan.
          </p>
          <p className="mt-2">
            The $0.99 plan does not renew, so there is no renewal to cancel. Access from that one-time purchase stays on the browser you used to pay.
          </p>
          <p className="mt-2">
            After you cancel a renewing plan, you keep access until the end of the period you already paid for. When that period ends, the free search limit applies again.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Refunds</h2>
          <p>
            {REFUND_TERMS} This applies to the $0.99 one-time plan, the $6.99 plan, and the $12.99 plan. Canceling a renewing plan stops future renewals. It is not a refund of the current period. Nothing in this section limits a right that the law does not allow us to limit, including a required remedy for an unauthorized charge.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. AI-generated ideas</h2>
          <p>
            Gift ideas are produced by an AI model. They can be wrong, incomplete, outdated, or unavailable. They are not professional, safety, or shopping advice. Check the retailer for the real price, availability, and whether an item is appropriate. We do not control Amazon, Walmart, or any other store, and we are not responsible for a purchase you make there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Acceptable use</h2>
          <p>
            Do not misuse the site. Do not try to bypass the search limit, probe the service, or send someone else&apos;s sensitive information. Do not enter a child&apos;s full name or birthday. Do not use the site to harm someone or to break the law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Age</h2>
          <p>
            You must be 18 or older to use Gifts4You and to buy a plan. The site is not for children under 13, and we do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Affiliate links</h2>
          <p>
            We may use affiliate links, including Amazon Associates links. {AMAZON_ASSOCIATES_DISCLOSURE} Other store links, including Walmart, are not affiliate links unless a disclosure on the page says they are.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">11. Limitation of liability</h2>
          <p>
            To the extent the law allows, {OPERATOR_LEGAL_NAME} is not liable for indirect, incidental, special, or consequential damages, or for a purchase you make at a retailer, or for relying on an AI-generated idea. Where a limit is not allowed, liability is limited to the smallest amount the law does allow. Nothing in these terms limits liability that the law does not allow us to limit.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">12. Contact</h2>
          <p>{OPERATOR_LINE}.</p>
          <p className="mt-2">
            <a className="text-violet-700 underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>

      <SiteFooter className="mt-12 space-y-3 border-t pt-6 text-sm leading-relaxed text-gray-700" />
    </div>
  );
}
