import { getGoogleAccessToken } from "../auth/access-token";

/** A non-2xx Google API response; `status` is read by isAuthError. */
export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

/**
 * Call a Google REST API as the signed-in user. Used instead of gapi.client so
 * the desktop app loads no remote scripts — these endpoints all support CORS.
 */
export async function googleFetch<T = unknown>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = getGoogleAccessToken();
  if (!token) throw new GoogleApiError("Not signed in to Google", 401);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Google error bodies look like { error: { code, message, status } }
    const detail = await response
      .json()
      .then((json: { error?: { message?: string } }) => json.error?.message)
      .catch(() => undefined);
    throw new GoogleApiError(
      `${detail ?? "Google API request failed"} (HTTP ${response.status})`,
      response.status,
    );
  }
  return (await response.json()) as T;
}
