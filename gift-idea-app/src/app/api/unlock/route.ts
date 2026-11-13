import { NextResponse } from "next/server";
import { readSearchLimitConfig } from "@/lib/search-limit-config";
import { createSearchLimitStore } from "@/lib/search-limit-store";
import { matchUnlockCode, readUnlockCodesFromEnv } from "@/lib/unlock";
import { applyVisitorCookies, requestIsSecure, resolveVisitor } from "@/lib/visitor-cookie";
import { warnOnce } from "@/lib/warn-once";

function fail(status = 200) {
  return NextResponse.json({ ok: false }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400);
  }

  const code =
    body && typeof body === "object" && "code" in body
      ? (body as { code?: unknown }).code
      : undefined;

  // Computed env access stays on the server and is read per request, including when the
  // variable was not present at build time. A missing variable fails closed.
  const result = matchUnlockCode(code, readUnlockCodesFromEnv());
  const config = readSearchLimitConfig();
  const visitor = config.cookieSecret
    ? await resolveVisitor(request.headers.get("cookie"), config.cookieSecret)
    : null;

  if (result.ok && visitor) {
    const store = createSearchLimitStore();
    if (store) {
      try {
        await store.grantUnlimited(visitor.visitorId, "unlock");
      } catch {
        warnOnce("[search-limit] Could not store unlock status. The visitor can submit the code again.");
      }
    }
  }

  const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  if (visitor) applyVisitorCookies(response, visitor, requestIsSecure(request));
  return response;
}
