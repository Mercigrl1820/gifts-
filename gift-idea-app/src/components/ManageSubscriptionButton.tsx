"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

const FALLBACK = `We couldn't open the billing page. Email ${CONTACT_EMAIL} and we will cancel the plan.`;

export function ManageSubscriptionButton({ prominent = false }: { prominent?: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function openPortal() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await response.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
      if (data && typeof data.url === "string") {
        window.location.assign(data.url);
        return;
      }
      setMessage(typeof data?.error === "string" && data.error.trim() ? data.error : FALLBACK);
    } catch {
      setMessage(FALLBACK);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={prominent ? "space-y-2" : "space-y-1"}>
      <button
        type="button"
        onClick={() => {
          void openPortal();
        }}
        disabled={pending}
        className={
          prominent
            ? "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
            : "text-violet-700 underline hover:text-violet-900 disabled:opacity-60"
        }
      >
        {pending ? "Opening billing page..." : "Manage or cancel subscription"}
      </button>
      {message ? (
        <p role="alert" className="text-sm leading-relaxed text-gray-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}
