/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { getSavedProfiles, saveProfile } from "../src/lib/storage";
import type { RecipientProfile } from "../src/types";

const profile: RecipientProfile = {
  id: "p1",
  name: "Sarah",
  occasion: "Birthday",
  relationship: "Friend",
  ageRange: "25-34",
  interests: "hiking",
  personality: "warm",
  budget: "$25 – $50",
  avoid: "",
  extraNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("saved profiles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("drops a legacy street address when profiles are read or saved", () => {
    localStorage.setItem(
      "giftidea_profiles",
      JSON.stringify([{ ...profile, address: "123 Main Street" }])
    );

    expect(getSavedProfiles()[0]).not.toHaveProperty("address");

    saveProfile({ ...profile, id: "p2", name: "Alex" });
    const stored = JSON.parse(localStorage.getItem("giftidea_profiles") || "[]") as Array<{
      address?: string;
    }>;
    expect(stored).toHaveLength(2);
    expect(stored.every((entry) => entry.address === undefined)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain("123 Main Street");
  });
});
