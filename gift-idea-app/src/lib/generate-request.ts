import type { GiftIdea } from "@/types";
import {
  buildGiftPrompt,
  excludeShownTitles,
  parseGiftIdeas,
  validateGenerateRequest,
} from "@/lib/gift-ideas";

export type GenerateCompletion = (prompt: string) => Promise<string | null | undefined>;

export const GENERATE_FAILURE_MESSAGE = "Could not generate gift ideas. Please try again.";

export type GenerateResponseBody = { ideas: GiftIdea[] } | { error: string };

export async function processGenerateRequest(
  body: unknown,
  complete: GenerateCompletion
): Promise<{ status: number; body: GenerateResponseBody }> {
  const validated = validateGenerateRequest(body);
  if (!validated.ok) {
    return { status: 400, body: { error: validated.error } };
  }

  try {
    const content = await complete(buildGiftPrompt(validated.value));
    const parsed = parseGiftIdeas(content);
    const ideas =
      validated.value.excludeTitles.length > 0
        ? excludeShownTitles(parsed, validated.value.excludeTitles)
        : parsed;
    return { status: 200, body: { ideas } };
  } catch (error: unknown) {
    console.error("Error generating ideas:", error);
    return { status: 500, body: { error: GENERATE_FAILURE_MESSAGE } };
  }
}
