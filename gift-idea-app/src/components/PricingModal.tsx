"use client";

import React from "react";
import Script from "next/script";

const PRICING_TABLE_ID = "prctbl_1UXXKEIAYv4F4L27F0BTqq2f";
const PUBLISHABLE_KEY =
  "pk_live_51UXPJjIAYv4F4L270jGtNXObsHUurmwCi94JsfZ3kjVQWlvZiGyKqpCeW24PeReLTqXm4vA8OZ7L7qLQRGxPHxCU00WsbwFrBr";

export function PricingModal({
  message,
  clientReferenceId,
  onClose,
}: {
  message: string | null;
  clientReferenceId: string;
  onClose: () => void;
}) {
  const tableProps: Record<string, string> = {
    "pricing-table-id": PRICING_TABLE_ID,
    "publishable-key": PUBLISHABLE_KEY,
  };
  if (clientReferenceId) {
    tableProps["client-reference-id"] = clientReferenceId;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-plan-title"
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
        <h2 id="upgrade-plan-title" className="text-xl font-bold text-center mb-5">
          Upgrade Your Plan
        </h2>
        {message ? <p className="text-center text-gray-700 mb-4">{message}</p> : null}
        <Script async src="https://js.stripe.com/v3/pricing-table.js" />
        {React.createElement("stripe-pricing-table", tableProps)}
      </div>
    </div>
  );
}
