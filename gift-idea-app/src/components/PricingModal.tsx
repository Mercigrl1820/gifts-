"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { PLAN_DISCLOSURES } from "@/lib/plan-terms";

const PRICING_TABLE_ID = "prctbl_1UXXKEIAYv4F4L27F0BTqq2f";
const PUBLISHABLE_KEY =
  "pk_live_51UXPJjIAYv4F4L270jGtNXObsHUurmwCi94JsfZ3kjVQWlvZiGyKqpCeW24PeReLTqXm4vA8OZ7L7qLQRGxPHxCU00WsbwFrBr";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PricingModal({
  message,
  clientReferenceId,
  onClose,
}: {
  message: string | null;
  clientReferenceId: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = dialogRef.current;
    const previouslyFocused = document.activeElement;
    node?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const tableProps: Record<string, string> = {
    "pricing-table-id": PRICING_TABLE_ID,
    "publishable-key": PUBLISHABLE_KEY,
  };
  if (clientReferenceId) {
    tableProps["client-reference-id"] = clientReferenceId;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-plan-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-gray-700"
        >
          ×
        </button>
        <h2 id="upgrade-plan-title" className="mb-3 text-center text-xl font-bold">
          Upgrade Your Plan
        </h2>
        {message ? <p className="mb-4 text-center text-gray-700">{message}</p> : null}
        <p className="mb-4 text-sm leading-relaxed text-gray-800">
          Read the plan terms below before you pay. The buy buttons are in the Stripe form under these terms.
          The Stripe window may still show the name GiftIdea. That charge is from Gifts4You.
        </p>
        <div className="mb-4 space-y-3">
          {PLAN_DISCLOSURES.map((plan) => (
            <section key={plan.title} className="rounded-xl border border-gray-200 p-3 text-sm leading-relaxed text-gray-800">
              <h3 className="mb-1 font-semibold text-gray-900">{plan.title}</h3>
              <p>{plan.body}</p>
            </section>
          ))}
        </div>
        <label className="mb-3 flex items-start gap-2 text-sm font-medium text-gray-900">
          <input
            type="checkbox"
            className="mt-1"
            checked={adultConfirmed}
            onChange={(event) => setAdultConfirmed(event.target.checked)}
          />
          <span>I&apos;m 18 or older, and I agree to these plan terms and the Terms of Service.</span>
        </label>
        <p className="mb-3 text-sm">
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">
            Terms of Service
          </Link>
        </p>
        <div className="mb-4">
          <ManageSubscriptionButton prominent />
        </div>
        {adultConfirmed ? (
          <>
            <Script async src="https://js.stripe.com/v3/pricing-table.js" />
            {React.createElement("stripe-pricing-table", tableProps)}
          </>
        ) : (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            Confirm you are 18 or older to show the buy buttons.
          </p>
        )}
      </div>
    </div>
  );
}
