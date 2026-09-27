import { GoogleApiError } from "../services/google/google-fetch";

/** True for 401/403 — usually fixed by signing in again. */
export function isAuthError(err: unknown): boolean {
  return (
    err instanceof GoogleApiError && (err.status === 401 || err.status === 403)
  );
}

export function describeGoogleError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Google API request failed";
}
