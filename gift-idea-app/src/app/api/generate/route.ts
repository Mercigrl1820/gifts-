import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      occasion,
      relationship,
      ageRange,
      gender,
      interests,
      personality,
      budget,
      avoid,
      extraNotes,
      recipientName,
      dislikedIdeas = [],
    } = body;

    if (!occasion || !relationship) {
      return NextResponse.json(
        { error: "Occasion and relationship are required" },
        { status: 400 }
      );
    }

    const prompt = `
You are a thoughtful gift recommendation expert.
Generate 5 personalized gift ideas based on the following information:

- Occasion: ${occasion}
- Relationship: ${relationship}
- Age range: ${ageRange || "Not specified"}
- Gender: ${gender || "Not specified"}
- Interests & hobbies: ${interests || "Not specified"}
- Personality / vibe: ${personality || "Not specified"}
- Budget: ${budget || "Flexible"}
- Things to avoid: ${avoid || "None"}
- Extra notes: ${extraNotes || "None"}
- Recipient name: ${recipientName || "Not specified"}

${
  dislikedIdeas && dislikedIdeas.length > 0
    ? `Important: Do NOT suggest any of these previously disliked ideas (or very similar ones): ${dislikedIdeas.join(", ")}.`
    : ""
}

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful gift recommendation assistant. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    const parsed = JSON.parse(content || "{}");

    return NextResponse.json({ ideas: parsed.ideas || [] });
  } catch (error: any) {
    console.error("Error generating ideas:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate gift ideas" },
      { status: 500 }
    );
  }
}
