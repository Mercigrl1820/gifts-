import { NextResponse } from "next/server";
import { matchUnlockCode, readUnlockCodesFromEnv } from "@/lib/unlock";

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
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
