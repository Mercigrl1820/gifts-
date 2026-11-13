import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdvertisingChoices } from "@/components/AdvertisingChoices";
import { SiteFooter } from "@/components/SiteFooter";
import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
} from "@/lib/affiliate-disclosure";
import { CONTACT_EMAIL, OPERATOR_LEGAL_NAME, OPERATOR_LINE } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy – Gifts4You",
  description: "Privacy Policy for Gifts4You",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-medium text-violet-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to app
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-2 text-sm text-gray-500">Last updated: November 13, 2026</p>
      <p className="mb-8 text-sm text-gray-700">
        {OPERATOR_LINE}. {OPERATOR_LEGAL_NAME}.
      </p>

      <div className="prose prose-sm space-y-6 leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Introduction</h2>
          <p>
            Gifts4You (“we”, “our”, or “the app”) is a website at gifts4you.app that helps adults find gift ideas.
            This policy explains what we collect, who processes it, and the choices you have.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Information you give us</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Gift details</strong>: occasion, relationship, interests, personality, budget, notes, and any name or birthday you choose to enter. These details are sent to an AI provider to generate ideas. Please do not enter a child&apos;s full name or birthday.
            </li>
            <li>
              <strong>Saved profiles</strong>: if you save a profile, it stays in localStorage on your device. We do not store those profiles on our servers.
            </li>
            <li>
              <strong>Unlock code</strong>: a code you submit is checked on our server. We store the resulting access flag against an anonymous visitor id, not your name.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Cookies</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>gift_visitor</strong>: a signed cookie that browsers do not let page scripts read. It holds a random visitor id so we can count free searches and remember a purchase.
            </li>
            <li>
              <strong>gift_vid</strong>: the same random id in a cookie that page scripts can read, so checkout can send it to Stripe. It is not your name or email.
            </li>
            <li>
              <strong>gift_ads_consent</strong>: stores whether you accepted or declined TikTok measurement. It lasts up to a year.
            </li>
          </ul>
          <p className="mt-2">
            Clearing cookies or using a private window creates a new visitor id. A separate daily limit still applies to the network connection, stored as a one-way hash of the network address.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Upstash Redis</h2>
          <p>
            We use Upstash Redis to store visitor data tied to the random id: the search count, the daily network-address hash, whether an unlock code or a one-time purchase removed the search limit, and, for a subscription, the Stripe customer id, subscription id, status, and paid-period end. We do not put your name, email, or gift notes in Redis.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. OpenAI</h2>
          <p>
            When you ask for gift ideas, the details you entered are sent to OpenAI so the model can write recommendations. OpenAI processes that information under its own terms. We send the details needed to create the ideas. Do not include a child&apos;s full name, birthday, or other sensitive information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Stripe</h2>
          <p>
            Payments are processed by Stripe. The card number and billing details are collected by Stripe, not stored by us. We keep the Stripe customer id and subscription status against the anonymous visitor id so we can open the billing page and know when a renewing plan is still active. A Stripe receipt or the payment window may still show the name GiftIdea. That charge is from Gifts4You.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Vercel Analytics and Speed Insights</h2>
          <p>
            The site is hosted on Vercel. We use Vercel Analytics and Speed Insights to understand traffic and performance, such as pages visited and general device or browser information. Vercel also processes technical logs for hosting and security.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. TikTok pixel</h2>
          <p>
            We use a TikTok pixel to measure advertising. It does not load until you accept it. If you decline, or if your browser sends the Global Privacy Control (GPC) signal, the pixel stays off. Events we send are limited to choices such as occasion and relationship, a gift title, and whether a limit or payment step happened. We do not send names, email addresses, or the notes you typed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Do Not Sell or Share</h2>
          <p>
            We do not sell personal information for money. Sharing an advertising identifier with TikTok can count as a “sale” or “share” under some state privacy laws. You can opt out here, or with the cookie banner, or with Global Privacy Control. GPC is honored even if a cookie previously said yes.
          </p>
          <AdvertisingChoices />
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">10. Affiliate links</h2>
          <p>
            We may use affiliate links. Today that means Amazon Associates links. {GENERAL_AFFILIATE_DISCLOSURE} {AMAZON_ASSOCIATES_DISCLOSURE} Search links to other stores, including Walmart, are not affiliate links. We do not use Target or impact.com links.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">11. Children</h2>
          <p>
            Gifts4You is not directed at children under 13. We do not knowingly collect personal information from children under 13. The site is for people 18 or older.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">12. Security and retention</h2>
          <p>
            We use reasonable measures to protect information the app processes. Profiles saved in the browser stay under your control. Anonymous search and purchase records stay until they are no longer needed to run the limits and paid access, or you ask us to delete the visitor record we can identify.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">13. Changes</h2>
          <p>We may update this policy. The “Last updated” date will change when we do.</p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">14. Contact</h2>
          <p>{OPERATOR_LINE}.</p>
          <p className="mt-2">
            Questions about this policy:{" "}
            <a className="text-violet-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>

      <SiteFooter className="mt-12 space-y-3 border-t pt-6 text-sm leading-relaxed text-gray-700" />
    </div>
  );
}
