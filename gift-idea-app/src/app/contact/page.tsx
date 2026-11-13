import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { CONTACT_EMAIL, OPERATOR_LINE } from "@/lib/site";

export const metadata = {
  title: "Contact – Gifts4You",
  description: "Contact Gifts4You about billing, subscriptions, cancellations, and privacy requests.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-medium text-violet-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to app
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Contact</h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-700">
        {OPERATOR_LINE}. Email us about billing, subscription questions, cancellations, or a privacy request.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Email</h2>
          <p>
            <a className="text-violet-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Cancel a subscription</h2>
          <p>
            You can cancel a subscription anytime online. Use Manage or cancel subscription on this page. It opens the Stripe customer portal for the browser you used to pay. You do not have to email us to cancel.
          </p>
        </section>
      </div>

      <SiteFooter className="mt-12 space-y-3 border-t pt-6 text-sm leading-relaxed text-gray-700" />
    </div>
  );
}
