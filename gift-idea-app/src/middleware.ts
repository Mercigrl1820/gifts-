import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSearchLimitConfig } from "@/lib/search-limit-config";
import { applyVisitorCookies, requestIsSecure, resolveVisitor } from "@/lib/visitor-cookie";

/**
 * Issue the anonymous visitor cookie on page loads so the pricing table can
 * send that id to Stripe. API routes set the same cookie when they run first.
 * Missing GIFT_VISITOR_COOKIE_SECRET skips the cookie and does not block the page.
 */
export async function middleware(request: NextRequest) {
  const config = readSearchLimitConfig();
  if (!config.cookieSecret) return NextResponse.next();

  const visitor = await resolveVisitor(request.headers.get("cookie"), config.cookieSecret);
  const response = NextResponse.next();
  applyVisitorCookies(response, visitor, requestIsSecure(request));
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
