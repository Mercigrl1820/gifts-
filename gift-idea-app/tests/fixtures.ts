import type { GiftIdea } from "../src/types";

export function idea(title: string): GiftIdea {
  return {
    title,
    description: `${title} description`,
    whyItFits: `${title} fits this person.`,
    estimatedPrice: "$25–$40",
    searchQuery: title,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
