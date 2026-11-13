import { NextResponse } from "next/server";
import { VISITOR_PUBLIC_COOKIE, isVisitorId } from "@/lib/public-visitor-id";

/** Signed httpOnly cookie. Page scripts cannot read this value. */
export const VISITOR_COOKIE = "gift_visitor";

const COOKIE_VERSION = "v1";
const MAX_COOKIE_LENGTH = 200;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export type VisitorCookie = {
  visitorId: string;
  value: string;
};

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64Url(new Uint8Array(signature));
}

function fixedEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function signVisitorCookie(visitorId: string, secret: string): Promise<string> {
  const payload = `${COOKIE_VERSION}.${visitorId}`;
  const signature = await hmacSha256(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifyVisitorCookie(value: string, secret: string): Promise<string | null> {
  if (!value || value.length > MAX_COOKIE_LENGTH) return null;
  const firstDot = value.indexOf(".");
  const secondDot = value.indexOf(".", firstDot + 1);
  if (firstDot <= 0 || secondDot <= firstDot || value.indexOf(".", secondDot + 1) !== -1) return null;

  const version = value.slice(0, firstDot);
  const visitorId = value.slice(firstDot + 1, secondDot);
  const signature = value.slice(secondDot + 1);
  if (version !== COOKIE_VERSION || !isVisitorId(visitorId) || signature.length === 0) return null;

  const expected = await hmacSha256(secret, `${version}.${visitorId}`);
  if (!fixedEqual(signature, expected)) return null;
  return visitorId;
}

/** Keep a valid id, or issue a new random one when the cookie is missing or tampered. */
export async function resolveVisitor(cookieHeader: string | null, secret: string): Promise<VisitorCookie> {
  const current = readCookie(cookieHeader, VISITOR_COOKIE);
  const existing = current ? await verifyVisitorCookie(current, secret) : null;
  const visitorId = existing ?? crypto.randomUUID();
  const value = await signVisitorCookie(visitorId, secret);
  return { visitorId, value };
}

export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function applyVisitorCookies(response: NextResponse, visitor: VisitorCookie, secure: boolean) {
  const shared = {
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
  response.cookies.set(VISITOR_COOKIE, visitor.value, { ...shared, httpOnly: true });
  response.cookies.set(VISITOR_PUBLIC_COOKIE, visitor.visitorId, { ...shared, httpOnly: false });
}
