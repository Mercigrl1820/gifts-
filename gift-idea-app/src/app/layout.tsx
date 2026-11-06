import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
        {/* Paste the meta tag from Target here */}
        <meta name="partnerize-verification" content= <meta name='impact-site-verification' value='81f3ed57-25ce-4bd7-8785-c551a89dd4d0'>/>
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
