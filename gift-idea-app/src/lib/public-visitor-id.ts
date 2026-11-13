/** Readable cookie holding the same random id as the signed httpOnly cookie. */
export const VISITOR_PUBLIC_COOKIE = "gift_vid";

const VISITOR_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVisitorId(value: string): boolean {
  return VISITOR_ID.test(value);
}

/** Read the public visitor id from a cookie header or document.cookie. */
export function readPublicVisitorId(cookieSource?: string): string {
  const source =
    cookieSource ?? (typeof document === "undefined" ? "" : document.cookie);
  if (!source) return "";

  for (const part of source.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    if (part.slice(0, separator).trim() !== VISITOR_PUBLIC_COOKIE) continue;
    let value = part.slice(separator + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return "";
    }
    return isVisitorId(value) ? value : "";
  }

  return "";
}
