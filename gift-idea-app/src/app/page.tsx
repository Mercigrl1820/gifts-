"use client";

import { useState, useEffect, useRef } from "react";
import { Gift, Sparkles, Heart, ArrowRight, ArrowLeft, Loader2, ExternalLink, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { GiftIdea, RecipientProfile, Occasion, Relationship } from "@/types";
import { getSavedProfiles, saveProfile, deleteProfile } from "@/lib/storage";
import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { PricingModal } from "@/components/PricingModal";
import { appendUniqueGiftIdeas, buildLoadMorePayload, type GiftSearchContext } from "@/lib/gift-ideas";
import { trackGiftSearch, trackRetailerClick } from "@/lib/tiktok";
import { trackLimitHit, trackPricingModalOpened, trackPurchase, type PricingOpenReason } from "@/lib/funnel";
import { freeSearchLimitMessage, isSearchLimitPayload, readFreeSearchLimit } from "@/lib/free-search-message";
import { readPublicVisitorId } from "@/lib/public-visitor-id";

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
const GENDERS = ["Male", "Female", "Unisex / Doesn't matter", "Prefer not to say"];

type Step = "home" | "form" | "results" | "profiles";

function unlockLimit(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 999) {
    return null;
  }
  return value;
}

function unlockSuccessMessage(limit: number): string {
  if (limit === 2) return "Basic plan unlocked — you can now save up to 2 profiles.";
  if (limit === 5) return "Advanced plan unlocked — you can now save up to 5 profiles.";
  if (limit === 999) return "Pro plan unlocked — unlimited profiles!";
  return `Plan unlocked — you can now save up to ${limit} profiles.`;
}

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [ideas, setIdeas] = useState<GiftIdea[]>([]);
  const [searchContext, setSearchContext] = useState<GiftSearchContext | null>(null);
  const searchVersion = useRef(0);
  const loadMoreLock = useRef(false);
  const [savedProfiles, setSavedProfiles] = useState<RecipientProfile[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [profileLimit, setProfileLimit] = useState(1);

  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState<Occasion | "">("");
  const [relationship, setRelationship] = useState<Relationship | "">("");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [interests, setInterests] = useState("");
  const [personality, setPersonality] = useState("");
  const [budget, setBudget] = useState("");
  const [avoid, setAvoid] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  const AMAZON_TAG = "23180ab-20";

  useEffect(() => {
    setSavedProfiles(getSavedProfiles());
    const savedLimit = localStorage.getItem("gift-limit");
    if (savedLimit) setProfileLimit(Number(savedLimit));
    setVisitorId(readPublicVisitorId());

    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId || !/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return;

    const storageKey = `gift-purchase-tracked:${sessionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") return;
    } catch {
      // Private mode can block sessionStorage. Still try to confirm the payment.
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json().catch(() => null)) as { paid?: unknown } | null;
        if (cancelled || data?.paid !== true) return;
        try {
          window.sessionStorage.setItem(storageKey, "1");
        } catch {
          // The pixel event still fires once for this page load.
        }
        trackPurchase();
      } catch {
        // A failed confirmation leaves the page usable. Stripe's webhook can still unlock the visitor.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openPricing = (reason: PricingOpenReason, message?: string) => {
    setVisitorId(readPublicVisitorId());
    setPricingMessage(message ?? null);
    setShowPricing(true);
    trackPricingModalOpened(reason);
  };

  const closePricing = () => {
    setShowPricing(false);
    setPricingMessage(null);
  };

  const showSearchLimit = (data: { limit?: unknown }) => {
    const limit = readFreeSearchLimit(data.limit);
    trackLimitHit(limit);
    openPricing("search_limit", freeSearchLimitMessage(limit));
  };

  const resetForm = () => {
    searchVersion.current += 1;
    loadMoreLock.current = false;
    setLoading(false);
    setLoadingMore(false);
    setLoadMoreError("");
    setSearchContext(null);
    setRecipientName("");
    setOccasion("");
    setRelationship("");
    setAgeRange("");
    setGender("");
    setBirthday("");
    setInterests("");
    setPersonality("");
    setBudget("");
    setAvoid("");
    setExtraNotes("");
    setIdeas([]);
    setError("");
  };

  const buildSearchContext = (): GiftSearchContext => ({
    occasion,
    relationship,
    ageRange,
    gender,
    birthday,
    interests,
    personality,
    budget,
    avoid,
    extraNotes,
    recipientName: recipientName || undefined,
    dislikedIdeas:
      savedProfiles.find(
        (p) => p.name.toLowerCase() === recipientName.trim().toLowerCase()
      )?.dislikedIdeas || [],
  });

  const handleUnlock = async () => {
    const code = unlockCode.trim();
    if (!code) {
      alert("Invalid code. Please check and try again.");
      setUnlockCode("");
      return;
    }

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: unknown; profileLimit?: unknown }
        | null;
      const limit = res.ok && data?.ok === true ? unlockLimit(data.profileLimit) : null;
      if (limit === null) {
        alert("Invalid code. Please check and try again.");
        return;
      }

      setProfileLimit(limit);
      localStorage.setItem("gift-limit", String(limit));
      alert(unlockSuccessMessage(limit));
    } catch {
      alert("Invalid code. Please check and try again.");
    } finally {
      setUnlockCode("");
    }
  };

  const handleGenerate = async () => {
    if (!occasion || !relationship) {
      setError("Please select at least an occasion and relationship.");
      return;
    }

    trackGiftSearch({ occasion, recipientType: relationship });

    const context = buildSearchContext();
    const version = ++searchVersion.current;
    loadMoreLock.current = false;
    setLoadingMore(false);
    setLoadMoreError("");
    setSearchContext(null);
    setLoading(true);
    setError("");
    setIdeas([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      const data = await res.json().catch(() => null);
      if (searchVersion.current !== version) return;
      if (isSearchLimitPayload(res.status, data)) {
        showSearchLimit(data);
        return;
      }
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "";
        throw new Error(message || "Something went wrong");
      }

      setSearchContext(context);
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
      setStep("results");
    } catch (err: unknown) {
      if (searchVersion.current !== version) return;
      const message = err instanceof Error ? err.message : "";
      setError(message || "Failed to generate ideas. Check your OpenAI key.");
    } finally {
      if (searchVersion.current === version) setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!searchContext || loadMoreLock.current) return;
    loadMoreLock.current = true;
    const version = searchVersion.current;
    const payload = buildLoadMorePayload(
      searchContext,
      ideas.map((idea) => idea.title)
    );
    setLoadingMore(true);
    setLoadMoreError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (searchVersion.current !== version) return;
      if (isSearchLimitPayload(res.status, data)) {
        showSearchLimit(data);
        return;
      }
      if (!res.ok) {
        const message =
          data && typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Could not load more gifts. Please try again.";
        throw new Error(message);
      }

      const incoming = Array.isArray(data.ideas) ? data.ideas : [];
      setIdeas((current) => {
        if (searchVersion.current !== version) return current;
        return appendUniqueGiftIdeas(current, incoming);
      });
    } catch (err: unknown) {
      if (searchVersion.current !== version) return;
      const message = err instanceof Error ? err.message : "";
      setLoadMoreError(message || "Could not load more gifts. Please try again.");
    } finally {
      if (searchVersion.current === version) {
        loadMoreLock.current = false;
        setLoadingMore(false);
      }
    }
  };

  const handleSaveProfile = () => {
    if (!recipientName.trim()) {
      alert("Please enter a name for this person so you can find them later.");
      return;
    }

    if (savedProfiles.length >= profileLimit) {
      alert(
        profileLimit <= 1
          ? "Free plan allows 1 profile. Upgrade to save more."
          : `Your plan allows up to ${profileLimit === 999 ? "unlimited" : profileLimit} profiles. Upgrade for more.`
      );
      openPricing("profile_limit");
      return;
    }

    const profile: RecipientProfile = {
      id: crypto.randomUUID(),
      name: recipientName.trim(),
      occasion: (occasion as Occasion) || "Other",
      relationship: (relationship as Relationship) || "Other",
      ageRange,
      gender,
      birthday,
      interests,
      personality,
      budget,
      avoid,
      extraNotes,
      createdAt: new Date().toISOString(),
      dislikedIdeas: [],
      likedIdeas: [],
    };

    saveProfile(profile);
    setSavedProfiles(getSavedProfiles());
    alert("Profile saved!");
  };

  const loadProfile = (p: RecipientProfile) => {
    setRecipientName(p.name);
    setOccasion(p.occasion);
    setRelationship(p.relationship);
    setAgeRange(p.ageRange);
    setGender(p.gender || "");
    setBirthday(p.birthday || "");
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

  const handleLike = (ideaTitle: string) => {
    if (!recipientName.trim()) {
      alert("Save this profile first so we can remember your likes.");
      return;
    }

    const existing = savedProfiles.find(
      (p) => p.name.toLowerCase() === recipientName.trim().toLowerCase()
    );

    if (existing) {
      const updatedLikes = Array.from(new Set([...(existing.likedIdeas || []), ideaTitle]));
      const updatedProfile = { ...existing, likedIdeas: updatedLikes };
      const all = getSavedProfiles().map((p) => (p.id === existing.id ? updatedProfile : p));
      localStorage.setItem("gift-profiles", JSON.stringify(all));
      setSavedProfiles(all);
      alert(`Saved! We'll remember that you liked "${ideaTitle}".`);
    } else {
      alert("Please save this profile first.");
    }
  };

  const handleDislike = (ideaTitle: string) => {
    if (!recipientName.trim()) {
      alert("Save this profile first so we can remember your dislikes.");
      return;
    }

    const existing = savedProfiles.find(
      (p) => p.name.toLowerCase() === recipientName.trim().toLowerCase()
    );

    if (existing) {
      const updatedDislikes = Array.from(new Set([...(existing.dislikedIdeas || []), ideaTitle]));
      const updatedProfile = { ...existing, dislikedIdeas: updatedDislikes };
      const all = getSavedProfiles().map((p) => (p.id === existing.id ? updatedProfile : p));
      localStorage.setItem("gift-profiles", JSON.stringify(all));
      setSavedProfiles(all);
      alert(`Got it — we won't suggest "${ideaTitle}" again.`);
    } else {
      alert("Please save this profile first.");
    }
  };

  const amazonLink = (query: string) =>
    `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;

  const walmartLink = (query: string) =>
    `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;

  if (step === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
        <header className="max-w-lg mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Gifts4You</span>
          </div>
          {savedProfiles.length > 0 && (
            <button onClick={() => setStep("profiles")} className="text-sm font-medium text-violet-700 hover:text-violet-900">
              Saved ({savedProfiles.length})
            </button>
          )}
        </header>
        <main className="max-w-lg mx-auto px-5 pt-10 pb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-6">
              <Sparkles className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Find the perfect gift<br />in minutes
            </h1>
            <p className="text-gray-600 text-[15px] leading-relaxed max-w-sm mx-auto">
              Answer a few questions about the person you’re shopping for and get thoughtful, personalized ideas.
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setStep("form"); }}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition active:scale-[0.98]"
          >
            Start finding gifts <ArrowRight className="w-5 h-5" />
          </button>
          {savedProfiles.length > 0 && (
            <button onClick={() => setStep("profiles")} className="w-full mt-3 text-violet-700 font-medium text-sm py-3">
              Or use a saved profile
            </button>
          )}
          <div className="mt-8">
            <button onClick={() => openPricing("upgrade")} className="w-full border border-violet-200 bg-white hover:bg-violet-50 text-violet-700 font-medium py-3.5 rounded-2xl transition">
              Upgrade — More Saved Profiles
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">Have an unlock code?</p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                placeholder="Enter code"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={handleUnlock}
                className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-xl"
              >
                Unlock
              </button>
            </div>
          </div>

          {showPricing && (
            <PricingModal
              message={pricingMessage}
              clientReferenceId={visitorId}
              onClose={closePricing}
            />
          )}
          <footer className="mt-16 text-center text-sm leading-relaxed text-gray-700 space-y-2">
            <AffiliateDisclosure variant="footer" />
            <Link href="/privacy" className="inline-block text-violet-700 underline hover:text-violet-900">
              Privacy Policy
            </Link>
          </footer>
        </main>
      </div>
    );
  }

  if (step === "profiles") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setStep("home")} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-semibold text-lg">Saved Profiles</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {savedProfiles.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No saved profiles yet.</p>
          ) : (
            savedProfiles.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-sm">
                <button onClick={() => loadProfile(p)} className="text-left flex-1">
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{p.relationship} · {p.occasion}</div>
                  {p.birthday && <div className="text-xs text-gray-400 mt-1">Birthday: {p.birthday}</div>}
                </button>
                <button onClick={() => handleDeleteProfile(p.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setStep("home")} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-semibold text-lg">Tell us about them</h1>
          </div>
        </header>
        <div className="max-w-lg mx-auto p-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient’s name <span className="text-gray-400 font-normal">(recommended)</span></label>
            <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. Sarah" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Occasion <span className="text-red-500">*</span></label>
            <select value={occasion} onChange={(e) => setOccasion(e.target.value as Occasion)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select occasion</option>
              {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship <span className="text-red-500">*</span></label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select gender</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Birthday (optional)</label>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Age range</label>
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select age range</option>
              {AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Interests & hobbies</label>
            <textarea value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. loves cooking, hiking, sci-fi books, coffee" rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Personality / vibe</label>
            <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="e.g. practical, sentimental, adventurous" rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget</label>
            <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">Select budget</option>
              {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Things to avoid</label>
            <input type="text" value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="e.g. no clothes, no scented items" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Anything else?</label>
            <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} placeholder="Recent life events, preferences..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          {error && <div className="bg-red-50 text-red-700 text-sm p-3.5 rounded-xl border border-red-100">{error}</div>}
        </div>
        {showPricing && (
          <PricingModal
            message={pricingMessage}
            clientReferenceId={visitorId}
            onClose={closePricing}
          />
        )}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-lg mx-auto">
            <button onClick={handleGenerate} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating ideas...</> : <><Sparkles className="w-5 h-5" /> Get gift ideas</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== IMPROVED RESULTS ==========
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setStep("form")} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Gift Ideas</h1>
          <button onClick={handleSaveProfile} className="p-2 text-violet-600 rounded-full hover:bg-violet-50">
            <Save className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {recipientName && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">Personalized ideas for</p>
            <h2 className="text-xl font-semibold text-gray-900">
              {recipientName}
              {occasion && <span className="text-violet-600 font-normal"> · {occasion}</span>}
            </h2>
          </div>
        )}

        <AffiliateDisclosure />

        <div className="space-y-5">
          {ideas.map((idea, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-semibold text-lg text-gray-900 leading-snug">
                  {idea.title}
                </h3>
                <span className="shrink-0 text-xs font-medium bg-violet-50 text-violet-700 px-3 py-1 rounded-full">
                  {idea.estimatedPrice}
                </span>
              </div>

              <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
                {idea.description}
              </p>

              <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 mb-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Why this fits
                </div>
                <p className="text-sm text-violet-900 leading-relaxed">
                  {idea.whyItFits}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <a
                  href={amazonLink(idea.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackRetailerClick({ retailer: "Amazon", giftTitle: idea.title })}
                  className="flex items-center justify-center gap-2 w-full bg-amber-400 hover:bg-amber-500 text-black font-semibold py-3.5 rounded-xl transition"
                >
                  Search on Amazon
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={walmartLink(idea.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackRetailerClick({ retailer: "Walmart", giftTitle: idea.title })}
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition"
                >
                  Search on Walmart
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex gap-2.5 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleLike(idea.title)}
                  className="flex-1 border border-green-200 text-green-700 font-medium py-2.5 rounded-xl text-sm hover:bg-green-50 transition"
                >
                  👍 Like
                </button>
                <button
                  onClick={() => handleDislike(idea.title)}
                  className="flex-1 border border-red-200 text-red-700 font-medium py-2.5 rounded-xl text-sm hover:bg-red-50 transition"
                >
                  👎 Dislike
                </button>
              </div>
            </div>
          ))}
        </div>

        {loadMoreError && (
          <div role="alert" className="mt-5 bg-red-50 text-red-700 text-sm p-3.5 rounded-xl border border-red-100">
            {loadMoreError}
          </div>
        )}

        <button
          onClick={handleLoadMore}
          disabled={loadingMore || !searchContext}
          className="mt-8 w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Loading more gifts...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Load more gifts
            </>
          )}
        </button>

        <button
          onClick={() => {
            resetForm();
            setStep("form");
          }}
          className="mt-3 w-full border border-violet-200 text-violet-700 font-medium py-3.5 rounded-2xl hover:bg-violet-50 transition"
        >
          Start a new search
        </button>
      </div>
      {showPricing && (
        <PricingModal
          message={pricingMessage}
          clientReferenceId={visitorId}
          onClose={closePricing}
        />
      )}
    </div>
  );
}
