import { NextResponse } from "next/server";
import OpenAI from "openai";
import { processGenerateRequest } from "@/lib/generate-request";
import { validateGenerateRequest } from "@/lib/gift-ideas";
import { clientIp, enforceSearchLimit, type SearchLimitDecision } from "@/lib/search-limit";
import { readSearchLimitConfig } from "@/lib/search-limit-config";
import { createSearchLimitStore } from "@/lib/search-limit-store";
import { applyVisitorCookies, requestIsSecure } from "@/lib/visitor-cookie";

function withVisitorCookie(response: NextResponse, decision: SearchLimitDecision, request: Request) {
  if (decision.cookie) {
    applyVisitorCookies(response, decision.cookie, requestIsSecure(request));
  }
  return response;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateGenerateRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  // Count (or refuse) before the model is called. Missing Redis or cookie
  // secret fails open inside enforceSearchLimit so an unconfigured deploy
  // still returns gift ideas.
  const decision = await enforceSearchLimit({
    store: createSearchLimitStore(),
    config: readSearchLimitConfig(),
    cookieHeader: request.headers.get("cookie"),
    ip: clientIp(request),
    isLoadMore: validated.value.excludeTitles.length > 0,
  });

  if (!decision.allowed) {
    return withVisitorCookie(
      NextResponse.json(
        { limitReached: true, limit: decision.limit },
        { status: 402, headers: { "Cache-Control": "no-store" } },
      ),
      decision,
      request,
    );
  }

  const result = await processGenerateRequest(body, async (prompt) => {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful gift recommendation assistant. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    return completion.choices[0].message.content;
  });

  return withVisitorCookie(
    NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    }),
    decision,
    request,
  );
}
