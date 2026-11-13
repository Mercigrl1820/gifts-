import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

export const metadata = {
  title: "About – Gifts4You",
  description: "About Gifts4You, operated by Nicholas Daniel, a sole proprietor in Georgia, United States.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-medium text-violet-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to app
      </Link>

      <h1 className="mb-2 text-3xl font-bold">About</h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-700">
        Gifts4You helps people find gift ideas fast. It is operated by Nicholas Daniel, a sole proprietor based in Georgia, United States.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Affiliate links</h2>
          <p>
            Some product links are affiliate links, including Amazon Associates and other partners. {GENERAL_AFFILIATE_DISCLOSURE}
          </p>
          <p className="mt-2">{AMAZON_ASSOCIATES_DISCLOSURE}</p>
        </section>
      </div>

      <SiteFooter className="mt-12 space-y-3 border-t pt-6 text-sm leading-relaxed text-gray-700" />
    </div>
  );
}
