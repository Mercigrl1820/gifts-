import { RecipientProfile } from "@/types";

const STORAGE_KEY = "giftidea_profiles";

export function getSavedProfiles(): RecipientProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: RecipientProfile) {
  const profiles = getSavedProfiles();
  const existing = profiles.findIndex((p) => p.id === profile.id);
  if (existing >= 0) {
    profiles[existing] = profile;
  } else {
    profiles.unshift(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.slice(0, 20))); // keep last 20
}

export function deleteProfile(id: string) {
  const profiles = getSavedProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
