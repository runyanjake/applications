/**
 * Google's JS clients reject with plain objects rather than Errors, so a bare
 * `err.message` loses the actual cause (expired token, disabled API, bad key).
 * These helpers dig the real message out so it can be logged *and* shown.
 *
 * Observed rejection shapes:
 *   { error: "idpiframe_initialization_failed", details: "..." }
 *   { error: { code: 403, message: "...", status: "..." } }
 *   { result: { error: { code: 400, message: "..." } }, status: 400 }
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function messageOf(value: unknown): string | null {
  const obj = asRecord(value);
  if (obj && typeof obj.message === "string") return obj.message;
  return null;
}

/** HTTP status code carried by a gapi rejection, when there is one. */
export function googleErrorStatus(err: unknown): number | null {
  const obj = asRecord(err);
  if (!obj) return null;
  if (typeof obj.status === "number") return obj.status;

  const inner =
    asRecord(obj.error) ?? asRecord(asRecord(obj.result)?.error) ?? null;
  if (inner && typeof inner.code === "number") return inner.code;
  return null;
}

/** True when the failure is an auth problem the user can fix by signing in again. */
export function isAuthError(err: unknown): boolean {
  const status = googleErrorStatus(err);
  return status === 401 || status === 403;
}

/** Best-effort human-readable description of a Google API failure. */
export function describeGoogleError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  const obj = asRecord(err);
  if (!obj) return "Google API request failed";

  const detail =
    (typeof obj.details === "string" ? obj.details : null) ??
    messageOf(obj.error) ??
    messageOf(asRecord(obj.result)?.error) ??
    (typeof obj.error === "string" ? obj.error : null) ??
    messageOf(obj);

  const status = googleErrorStatus(err);
  if (detail) return status ? `${detail} (HTTP ${status})` : detail;
  if (status) return `Google API request failed with HTTP ${status}`;

  try {
    return JSON.stringify(err);
  } catch {
    return "Google API request failed";
  }
}
