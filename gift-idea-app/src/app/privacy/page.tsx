import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AMAZON_ASSOCIATES_DISCLOSURE,
  GENERAL_AFFILIATE_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

export const metadata = {
  title: "Privacy Policy – GiftIdea",
  description: "Privacy Policy for the GiftIdea app",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-violet-600 font-medium mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to app
      </Link>

      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: November 12, 2026</p>

      <div className="prose prose-sm space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Introduction</h2>
          <p>
            GiftIdea (“we”, “our”, or “the app”) is a web application that helps users find personalized gift ideas. 
            This Privacy Policy explains what information we collect, how we use it, and your rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
          <p>We collect the following information when you use the app:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Information you provide</strong>: Details you enter about gift recipients (name, relationship, interests, personality, budget, occasion, and any notes). This information is used only to generate gift recommendations.
            </li>
            <li>
              <strong>Saved profiles</strong>: If you choose to save a recipient profile, that data is stored locally in your browser (localStorage) on your device. We do not store these profiles on our servers.
            </li>
            <li>
              <strong>Usage data</strong>: Basic technical information such as browser type and pages visited may be collected by our hosting provider (Vercel) for performance and security purposes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To generate personalized gift recommendations using artificial intelligence.</li>
            <li>To improve the app experience.</li>
            <li>We do <strong>not</strong> sell your personal information.</li>
            <li>We do <strong>not</strong> share recipient details with third parties for marketing purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. AI Processing</h2>
          <p>
            When you request gift ideas, the information you provide is sent to OpenAI’s API so the AI can generate recommendations. 
            OpenAI processes this data according to their own privacy policy and data usage policies. 
            We only send the information necessary to create the recommendations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Affiliate Links</h2>
          <p>
            GiftIdea participates in affiliate programs, including the Amazon Associates Program and the impact.com partner network (retailers such as Walmart and Target). {GENERAL_AFFILIATE_DISCLOSURE}
          </p>
          <p className="mt-2">
            <strong>{AMAZON_ASSOCIATES_DISCLOSURE}</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Cookies and Local Storage</h2>
          <p>
            The app uses your browser’s localStorage to save recipient profiles if you choose to save them. 
            This data stays on your device and is not transmitted to our servers. 
            You can clear it at any time by clearing your browser data or deleting the profiles inside the app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Data Security</h2>
          <p>
            We take reasonable measures to protect information processed by the app. 
            Because recipient profiles are stored only on your device, you remain in control of that data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Children’s Privacy</h2>
          <p>
            GiftIdea is not directed at children under 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. 
            The “Last updated” date at the top of this page will reflect any changes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">10. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through the contact method provided on the app or website.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t text-sm leading-relaxed text-gray-700 space-y-2">
        <p>{GENERAL_AFFILIATE_DISCLOSURE}</p>
        <p>
          <strong>Amazon Associates Disclosure:</strong> {AMAZON_ASSOCIATES_DISCLOSURE}
        </p>
      </div>
    </div>
  );
}
