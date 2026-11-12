import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

export function AffiliateDisclosure({
  variant = "results",
}: {
  variant?: "results" | "footer";
}) {
  if (variant === "footer") {
    return (
      <div role="note" aria-label="Affiliate disclosure" className="space-y-1">
        <p>{GENERAL_AFFILIATE_DISCLOSURE}</p>
        <p>{AMAZON_ASSOCIATES_DISCLOSURE}</p>
      </div>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Affiliate disclosure"
      className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3.5 text-[15px] font-medium leading-relaxed text-violet-950"
    >
      <p>{GENERAL_AFFILIATE_DISCLOSURE}</p>
      <p className="mt-1.5 text-sm font-normal leading-relaxed">
        {AMAZON_ASSOCIATES_DISCLOSURE}
      </p>
    </aside>
  );
}
