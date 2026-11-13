"use client";

import { useEffect, useState } from "react";
import {
  globalPrivacyControlEnabled,
  startTikTokPixel,
  writeAdsConsent,
} from "@/lib/tiktok";

export function AdvertisingChoices() {
  const [gpc, setGpc] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGpc(globalPrivacyControlEnabled());
    startTikTokPixel();
  }, []);

  return (
    <div className="mt-3 space-y-3">
      {gpc ? (
        <p>
          Your browser sent Global Privacy Control. We treat that as a request not to sell or share, and the TikTok pixel stays off.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            writeAdsConsent("denied");
            startTikTokPixel();
            setMessage("TikTok measurement is off for this browser.");
          }}
          className="rounded-xl border border-gray-300 px-4 py-2 text-left font-medium text-gray-900 hover:bg-gray-50"
        >
          Do Not Sell or Share My Personal Information
        </button>
        <button
          type="button"
          onClick={() => {
            if (globalPrivacyControlEnabled()) {
              setGpc(true);
              startTikTokPixel();
              setMessage("Global Privacy Control is on, so TikTok measurement stays off.");
              return;
            }
            writeAdsConsent("granted");
            startTikTokPixel();
            setMessage("TikTok measurement is on for this browser.");
          }}
          className="rounded-xl border border-gray-300 px-4 py-2 text-left font-medium text-gray-900 hover:bg-gray-50"
        >
          Allow TikTok measurement
        </button>
      </div>
      {message ? (
        <p role="status" className="text-sm text-gray-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}
