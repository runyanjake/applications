/**
 * Application ids. `crypto.randomUUID` needs a secure context, so fall back to
 * a random-hex id when the app is served over plain HTTP.
 */
export function generateId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
