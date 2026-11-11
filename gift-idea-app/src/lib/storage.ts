import { RecipientProfile } from "@/types";

const STORAGE_KEY = "giftidea_profiles";

function withoutLegacyAddress(profile: RecipientProfile): RecipientProfile {
  if (!profile || typeof profile !== "object") return profile;
  const copy = { ...profile } as RecipientProfile & { address?: unknown };
  delete copy.address;
  return copy;
}

export function getSavedProfiles(): RecipientProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecipientProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((profile) => withoutLegacyAddress(profile));
  } catch {
    return [];
  }
}

export function saveProfile(profile: RecipientProfile) {
  const profiles = getSavedProfiles();
  const next = withoutLegacyAddress(profile);
  const existing = profiles.findIndex((p) => p.id === next.id);
  if (existing >= 0) {
    profiles[existing] = next;
  } else {
    profiles.unshift(next);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.slice(0, 20))); // keep last 20
}

export function deleteProfile(id: string) {
  const profiles = getSavedProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
