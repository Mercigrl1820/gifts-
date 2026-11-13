import Link from "next/link";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { SUPPORT_EMAIL, OPERATOR_LINE } from "@/lib/site";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className ?? "mt-16 space-y-3 text-center text-sm leading-relaxed text-gray-700"}>
      <AffiliateDisclosure variant="footer" />
      <p>{OPERATOR_LINE}</p>
      <p>
        <a className="text-violet-700 underline hover:text-violet-900" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/contact" className="text-violet-700 underline hover:text-violet-900">
          Contact
        </Link>
        <Link href="/about" className="text-violet-700 underline hover:text-violet-900">
          About
        </Link>
        <Link href="/privacy" className="text-violet-700 underline hover:text-violet-900">
          Privacy Policy
        </Link>
        <Link href="/terms" className="text-violet-700 underline hover:text-violet-900">
          Terms of Service
        </Link>
      </p>
      <ManageSubscriptionButton />
    </footer>
  );
}
