import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConsentBanner } from "@/components/ConsentBanner";
import { tiktokPixelBaseCode } from "@/lib/tiktok";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gifts4You",
  description: "Find the perfect gift in minutes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="impact-site-verification" content="81f3ed57-25ce-4bd7-8785-c551a89dd4d0" />
      </head>
      <body>
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {tiktokPixelBaseCode()}
        </Script>
        <ConsentBanner />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
