const seen = new Set<string>();

/** Log a rollout warning once per server instance so a missing integration does not flood logs. */
export function warnOnce(message: string) {
  if (seen.has(message)) return;
  seen.add(message);
  console.warn(message);
}

export function resetWarnings() {
  seen.clear();
}
