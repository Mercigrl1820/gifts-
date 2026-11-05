"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { Gift, Sparkles, User, Heart, ArrowRight, ArrowLeft, Loader2, ExternalLink, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { GiftIdea, RecipientProfile, Occasion, Relationship } from "@/types";
import { getSavedProfiles, saveProfile, deleteProfile } from "@/lib/storage";

const OCCASIONS: Occasion[] = [
  "Birthday", "Anniversary", "Christmas", "Valentine's Day",
  "Mother's Day", "Father's Day", "Wedding", "Graduation",
  "Housewarming", "Just Because", "Other"
];

const RELATIONSHIPS: Relationship[] = [
  "Partner / Spouse", "Parent", "Child", "Sibling",
  "Friend", "Coworker", "Boss", "Other Family", "Other"
];

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Prefer not to say"];

const BUDGETS = ["Under $25", "$25 – $50", "$50 – $100", "$100 – $200", "$200+", "No limit / Flexible"];

type Step = "home" | "form" | "results" | "profiles";

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<RecipientProfile[]>([]);
  const [showPricing, setShowPricing] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState<Occasion | "">("");
  const [relationship, setRelationship] = useState<Relationship | "">("");
  const [ageRange, setAgeRange] = useState("");
  const [interests, setInterests] = useState("");
  const [personality, setPersonality] = useState("");
  const [budget, setBudget] = useState("");
  const [avoid, setAvoid] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // Amazon associate tag
  const AMAZON_TAG = "23180ab-20";

  useEffect(() => {
    setSavedProfiles(getSavedProfiles());
  }, []);

  const resetForm = () => {
    setRecipientName("");
    setOccasion("");
    setRelationship("");
    setAgeRange("");
    setInterests("");
    setPersonality("");
    setBudget("");
    setAvoid("");
    setExtraNotes("");
    setIdeas([]);
    setError("");
  };

  const handleGenerate = async () => {
    if (!occasion || !relationship) {
      setError("Please select at least an occasion and relationship.");
      return;
    }

    setLoading(true);
    setError("");
    setIdeas([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          relationship,
          ageRange,
          interests,
          personality,
          budget,
          avoid,
          extraNotes,
          recipientName: recipientName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setIdeas(data.ideas || []);
      setStep("results");
    } catch (err: any) {
      setError(err.message || "Failed to generate ideas. Check your OpenAI key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    if (!recipientName.trim()) {
      alert("Please enter a name for this person so you can find them later.");
      return;
    }

    // Free users are limited to 2 profiles
    if (savedProfiles.length >= 2) {
      alert("Free plan is limited to 2 saved profiles. Upgrade to Pro for unlimited profiles.");
      setShowPricing(true);
      return;
    }

    const profile: RecipientProfile = {
      id: crypto.randomUUID(),
      name: recipientName.trim(),
      occasion: (occasion as Occasion) || "Other",
      relationship: (relationship as Relationship) || "Other",
      ageRange,
      interests,
      personality,
      budget,
      avoid,
      extraNotes,
      createdAt: new Date().toISOString(),
    };

    saveProfile(profile);
    setSavedProfiles(getSavedProfiles());
    alert("Profile saved! You can reuse it next time.");
  };

  const loadProfile = (p: RecipientProfile) => {
    setRecipientName(p.name);
    setOccasion(p.occasion);
    setRelationship(p.relationship);
    setAgeRange(p.ageRange);
    setInterests(p.interests);
    setPersonality(p.personality);
    setBudget(p.budget);
    setAvoid(p.avoid);
    setExtraNotes(p.extraNotes);
    setStep("form");
  };

  const handleDeleteProfile = (id: string) => {
    if (confirm("Delete this saved profile?")) {
      deleteProfile(id);
      setSavedProfiles(getSavedProfiles());
    }
  };

  const amazonLink = (query: string) => {
    const encoded = encodeURIComponent(query);
    return `https://www.amazon.com/s?k=${encoded}&tag=${AMAZON_TAG}`;
  };

  const walmartLink = (query: string) => {
    const encoded = encodeURIComponent(query);
    return `https://www.walmart.com/search?q=${encoded}`;
  };

  // ========== RENDER ==========

  if (step === "home") {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="p-4 flex items-center justify-between max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Gift className="w-6 h-6 text-violet-600" />
            <span>GiftIdea</span>
          </div>
          {savedProfiles.length > 0 && (
            <button
              onClick={() => setStep("profiles")}
              className="text-sm text-violet-600 font-medium"
            >
              Saved ({savedProfiles.length})
            </button>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 max-w-lg mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-violet-600" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-3 leading-tight">
            Find the perfect gift in minutes
          </h1>

          <p className="text-center text-gray-600 mb-10 leading-relaxed">
            Answer a few questions about the person you’re shopping for and get thoughtful, personalized ideas — not generic lists.
          </p>

          <button
            onClick={() => {
              resetForm();
              setStep("form");
            }}
            className="w-full bg-violet-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-200 active:scale-[0.98] transition"
          >
            Start finding gifts
            <ArrowRight className="w-5 h-5" />
          </button>

          {savedProfiles.length > 0 && (
            <button
              onClick={() => setStep("profiles")}
              className="mt-4 text-violet-600 font-medium text-sm"
            >
              Or use a saved profile
            </button>
          )}

          {/* Upgrade Button */}
          <div className="mt-10 text-center px-4">
            <button
              onClick={() => setShowPricing(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-md transition"
            >
              Upgrade to Pro – Unlimited Profiles
            </button>
          </div>

          {/* Pricing Table Modal */}
          {showPricing && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                  onClick={() => setShowPricing(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  ×
                </button>

                <h2 className="text-xl font-bold text-center mb-4">Upgrade to Pro</h2>

                <Script async src="https://js.stripe.com/v3/pricing-table.js" />

                {React.createElement("stripe-pricing-table", {
                  "pricing-table-id": "prctbl_1UXXKEIAYv4F4L27F0BTqq2f",
                  "publishable-key": "pk_live_51UXPJjIAYv4F4L270jGtNXObsHUurmwCi94JsfZ3kjVQWlvZiGyKqpCeW24PeReLTqXm4vA8OZ7L7qLQRGxPHxCU00WsbwFrBr",
                })}
              </div>
            </div>
          )}

          <footer className="mt-16 text-center text-xs text-gray-400 space-y-2">
            <p>As an Amazon Associate I earn from qualifying purchases.</p>
            <p>
              <Link href="/privacy" className="underline hover:text-violet-600">
                Privacy Policy
              </Link>
            </p>
          </footer>
        </main>
      </div>
    );
  }

  if (step === "profiles") {
    return (
      <div className="min-h-screen max-w-lg mx-auto">
        <header className="p-4 flex items-center gap-3 border-b">
          <button onClick={() => setStep("home")} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Saved Profiles</h1>
        </header>

        <div className="p-4 space-y-3">
          {savedProfiles.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No saved profiles yet.</p>
          ) : (
            savedProfiles.map((p) => (
              <div
                key={p.id}
                className="bg-white border rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm"
              >
                <button onClick={() => loadProfile(p)} className="text-left flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {p.relationship} · {p.occasion}
                  </div>
                  {p.interests && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                      {p.interests}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteProfile(p.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen max-w-lg mx-auto pb-28">
        <header className="sticky top-0 bg-[var(--background)] z-10 p-4 flex items-center gap-3 border-b">
          <button onClick={() => setStep("home")} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Tell us about them</h1>
        </header>

        <div className="p-4 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Recipient’s name <span className="text-gray-400">(optional but recommended)</span>
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Occasion <span className="text-red-500">*</span>
            </label>
            <select
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as Occasion)}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select occasion</option>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Relationship <span className="text-red-500">*</span>
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relationship)}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Age range</label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select age range</option>
              {AGE_RANGES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Interests & hobbies</label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. loves cooking, hiking, sci-fi books, coffee"
              rows={3}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Personality / vibe</label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="e.g. practical, sentimental, adventurous, introvert, loves surprises"
              rows={2}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Budget</label>
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select budget</option>
              {BUDGETS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Things to avoid</label>
            <input
              type="text"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="e.g. no clothes, no scented items, already has a Kindle"
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Anything else?</label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Recent life events, inside jokes, preferences..."
              rows={2}
              className="w-full border rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-lg mx-auto">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-violet-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating ideas...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Get gift ideas
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Results step
  return (
    <div className="min-h-screen max-w-lg mx-auto pb-8">
      <header className="sticky top-0 bg-[var(--background)] z-10 p-4 flex items-center justify-between border-b">
        <button onClick={() => setStep("form")} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Gift Ideas</h1>
        <button
          onClick={handleSaveProfile}
          className="p-2 text-violet-600"
          title="Save this profile"
        >
          <Save className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4">
        {recipientName && (
          <p className="text-sm text-gray-500 mb-4">
            Ideas for <span className="font-medium text-gray-800">{recipientName}</span>
            {occasion && <> · {occasion}</>}
          </p>
        )}

        <div className="space-y-4">
          {ideas.map((idea, idx) => (
            <div key={idx} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-lg leading-snug">{idea.title}</h3>
                <span className="text-xs font-medium bg-violet-50 text-violet-700 px-2 py-1 rounded-full whitespace-nowrap">
                  {idea.estimatedPrice}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-3">{idea.description}</p>

              <div className="bg-violet-50 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 mb-1">
                  <Heart className="w-3.5 h-3.5" />
                  Why this fits
                </div>
                <p className="text-sm text-violet-900 leading-relaxed">{idea.whyItFits}</p>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={amazonLink(idea.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold py-3 rounded-xl transition"
                >
                  Search on Amazon
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={walmartLink(idea.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                >
                  Search on Walmart
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            resetForm();
            setStep("form");
          }}
          className="mt-6 w-full border border-violet-200 text-violet-700 font-medium py-3 rounded-2xl"
        >
          Start a new search
        </button>
      </div>
    </div>
  );
}
