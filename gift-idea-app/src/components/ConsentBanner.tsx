"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  globalPrivacyControlEnabled,
  readAdsConsent,
  startTikTokPixel,
  writeAdsConsent,
} from "@/lib/tiktok";

type BannerState = "unknown" | "granted" | "denied" | "gpc";

export function ConsentBanner() {
  const [state, setState] = useState<BannerState>("unknown");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (globalPrivacyControlEnabled()) {
      startTikTokPixel();
      setState("gpc");
      setReady(true);
      return;
    }
    const choice = readAdsConsent(document.cookie);
    startTikTokPixel();
    setState(choice ?? "unknown");
    setReady(true);
  }, []);

  if (!ready || state !== "unknown") return null;

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3 text-sm leading-relaxed text-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <p>
          We use a TikTok pixel to measure advertising. It stays off until you choose.{" "}
          <Link href="/privacy" className="text-violet-700 underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              writeAdsConsent("denied");
              startTikTokPixel();
              setState("denied");
            }}
            className="rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => {
              writeAdsConsent("granted");
              startTikTokPixel();
              setState("granted");
            }}
            className="rounded-xl bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
