export function buildGiftPrompt(data: {
  occasion: string;
  relationship: string;
  ageRange: string;
  interests: string;
  personality: string;
  budget: string;
  avoid: string;
  extraNotes: string;
  recipientName?: string;
}): string {
  const name = data.recipientName || "the recipient";

  return `You are an expert gift consultant. Generate 6 highly personalized, thoughtful gift ideas.

Recipient details:
- Name: ${name}
- Occasion: ${data.occasion}
- Relationship to giver: ${data.relationship}
- Age range: ${data.ageRange || "not specified"}
- Interests & hobbies: ${data.interests || "not specified"}
- Personality / vibe: ${data.personality || "not specified"}
- Budget: ${data.budget || "flexible"}
- Things to avoid: ${data.avoid || "none"}
- Extra notes: ${data.extraNotes || "none"}

Rules:
1. Make ideas specific and non-generic. Avoid generic gift cards unless truly perfect.
2. Prefer items that feel personal and thoughtful based on the details.
3. Stay within or close to the stated budget.
4. Respect the "things to avoid".
5. For each idea include a short, warm explanation of WHY it fits this specific person and occasion.
6. Provide a good Amazon-style search query for each idea so the user can easily find it.
7. Vary the ideas (practical, experiential, sentimental, fun, etc.) when possible.

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "ideas": [
    {
      "title": "Short gift name",
      "description": "1-2 sentence description of the gift",
      "whyItFits": "Why this is a great match for this person and occasion",
      "estimatedPrice": "$XX - $YY",
      "searchQuery": "exact search terms to find this on Amazon",
      "category": "e.g. Experience, Home, Fashion, Tech, Food, etc."
    }
  ]
}`;
}
