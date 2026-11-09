import type { GiftIdea } from "@/types";

export const GIFT_BATCH_SIZE = 5;
export const MAX_TEXT_LENGTH = 5000;
export const MAX_LIST_LENGTH = 100;
export const MAX_TITLE_LENGTH = 300;

export type GenerateRequestInput = {
  occasion: string;
  relationship: string;
  ageRange: string;
  gender: string;
  interests: string;
  personality: string;
  budget: string;
  avoid: string;
  extraNotes: string;
  recipientName: string;
  dislikedIdeas: string[];
  excludeTitles: string[];
};

export type GiftSearchContext = {
  occasion: string;
  relationship: string;
  ageRange: string;
  gender: string;
  birthday: string;
  interests: string;
  personality: string;
  budget: string;
  avoid: string;
  extraNotes: string;
  recipientName?: string;
  dislikedIdeas: string[];
};

export type ValidationResult =
  | { ok: true; value: GenerateRequestInput }
  | { ok: false; error: string };

const OPTIONAL_TEXT_FIELDS = [
  "ageRange",
  "gender",
  "interests",
  "personality",
  "budget",
  "avoid",
  "extraNotes",
  "recipientName",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredText(
  value: unknown,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: "Occasion and relationship are required" };
  }
  if (value.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `${label} is too long` };
  }
  return { ok: true, value };
}

function readOptionalText(
  value: unknown,
  label: string
): { ok: true; value: string } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: "" };
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }
  if (value.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `${label} is too long` };
  }
  return { ok: true, value };
}

function readTitleList(
  value: unknown,
  label: string
): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return { ok: false, error: `${label} must be an array of strings` };
  }
  if (value.length > MAX_LIST_LENGTH) {
    return { ok: false, error: `${label} contains too many items` };
  }

  const titles: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error: `${label} must be an array of strings` };
    }
    if (item.length > MAX_TITLE_LENGTH) {
      return { ok: false, error: `${label} contains an item that is too long` };
    }
    if (item.trim() !== "") titles.push(item);
  }
  return { ok: true, value: titles };
}

export function validateGenerateRequest(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const occasion = readRequiredText(body.occasion, "occasion");
  if (!occasion.ok) return occasion;
  const relationship = readRequiredText(body.relationship, "relationship");
  if (!relationship.ok) return relationship;

  const optional: Record<(typeof OPTIONAL_TEXT_FIELDS)[number], string> = {
    ageRange: "",
    gender: "",
    interests: "",
    personality: "",
    budget: "",
    avoid: "",
    extraNotes: "",
    recipientName: "",
  };

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const read = readOptionalText(body[field], field);
    if (!read.ok) return read;
    optional[field] = read.value;
  }

  const dislikedIdeas = readTitleList(body.dislikedIdeas, "dislikedIdeas");
  if (!dislikedIdeas.ok) return dislikedIdeas;
  const excludeTitles = readTitleList(body.excludeTitles, "excludeTitles");
  if (!excludeTitles.ok) return excludeTitles;

  return {
    ok: true,
    value: {
      occasion: occasion.value,
      relationship: relationship.value,
      ...optional,
      dislikedIdeas: dislikedIdeas.value,
      excludeTitles: excludeTitles.value,
    },
  };
}

export function normalizeGiftTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function appendUniqueGiftIdeas(existing: GiftIdea[], incoming: GiftIdea[]): GiftIdea[] {
  const seen = new Set(
    existing.map((idea) => normalizeGiftTitle(idea.title)).filter((title) => title !== "")
  );
  const next = [...existing];

  for (const idea of incoming) {
    if (!idea || typeof idea.title !== "string") continue;
    const key = normalizeGiftTitle(idea.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(idea);
  }

  return next;
}

export function excludeShownTitles(ideas: GiftIdea[], excludeTitles: string[]): GiftIdea[] {
  const seen = new Set(
    excludeTitles.map((title) => normalizeGiftTitle(title)).filter((title) => title !== "")
  );
  const unique: GiftIdea[] = [];

  for (const idea of ideas) {
    const key = normalizeGiftTitle(idea.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(idea);
  }

  return unique;
}

export function buildLoadMorePayload(
  context: GiftSearchContext,
  currentTitles: string[]
): GiftSearchContext & { excludeTitles: string[] } {
  return {
    ...context,
    excludeTitles: currentTitles.filter((title) => typeof title === "string" && title.trim() !== ""),
  };
}

function embedTitles(values: string[]): string {
  return values.map((value) => value.replace(/[\r\n]+/g, " ").trim()).join(", ");
}

export function buildGiftPrompt(input: GenerateRequestInput): string {
  const exclusionBlock =
    input.excludeTitles.length > 0
      ? `\nImportant: Do NOT suggest any of these gifts that are already shown, or very similar ones: ${embedTitles(input.excludeTitles)}.`
      : "";

  return `
You are a thoughtful gift recommendation expert.
Generate ${GIFT_BATCH_SIZE} personalized gift ideas based on the following information:

- Occasion: ${input.occasion}
- Relationship: ${input.relationship}
- Age range: ${input.ageRange || "Not specified"}
- Gender: ${input.gender || "Not specified"}
- Interests & hobbies: ${input.interests || "Not specified"}
- Personality / vibe: ${input.personality || "Not specified"}
- Budget: ${input.budget || "Flexible"}
- Things to avoid: ${input.avoid || "None"}
- Extra notes: ${input.extraNotes || "None"}
- Recipient name: ${input.recipientName || "Not specified"}

${
  input.dislikedIdeas.length > 0
    ? `Important: Do NOT suggest any of these previously disliked ideas (or very similar ones): ${input.dislikedIdeas.join(", ")}.`
    : ""
}${exclusionBlock}

For each gift idea, return:
- title (short name of the gift)
- description (1-2 sentences)
- whyItFits (why this is a good match)
- estimatedPrice (e.g. "$25–$40")
- searchQuery (a good search phrase to use on Amazon or Walmart)

Return the response as a valid JSON object with this exact structure:
{
  "ideas": [
    {
      "title": "",
      "description": "",
      "whyItFits": "",
      "estimatedPrice": "",
      "searchQuery": ""
    }
  ]
}
`;
}

function toGiftIdea(value: unknown): GiftIdea | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== "string" || record.title.trim() === "") return null;
  return {
    title: record.title,
    description: typeof record.description === "string" ? record.description : "",
    whyItFits: typeof record.whyItFits === "string" ? record.whyItFits : "",
    estimatedPrice: typeof record.estimatedPrice === "string" ? record.estimatedPrice : "",
    searchQuery: typeof record.searchQuery === "string" ? record.searchQuery : "",
  };
}

export function parseGiftIdeas(content: string | null | undefined): GiftIdea[] {
  const parsed: unknown = JSON.parse(content || "{}");
  if (!parsed || typeof parsed !== "object" || !("ideas" in parsed)) return [];
  const ideas = (parsed as { ideas?: unknown }).ideas;
  if (!Array.isArray(ideas)) return [];
  return ideas.map(toGiftIdea).filter((idea): idea is GiftIdea => idea !== null);
}
