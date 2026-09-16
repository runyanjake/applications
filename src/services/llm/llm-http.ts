/** Shared request plumbing for the LLM providers. */
async function requestJson<T>(
  provider: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    // fetch only rejects on network/CORS failures, which are the common
    // self-hosted misconfiguration — say so rather than "Failed to fetch".
    // The URL is shown without its query, which can carry an API key.
    throw new Error(
      `Could not reach the ${provider} endpoint at ${url.split("?")[0]}. Check the URL and that the server allows cross-origin requests. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${provider} API error (${response.status}): ${detail}`);
  }
  return (await response.json()) as T;
}

export function postJson<T>(
  provider: string,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  return requestJson<T>(provider, url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export function getJson<T>(
  provider: string,
  url: string,
  headers: Record<string, string> = {},
): Promise<T> {
  return requestJson<T>(provider, url, { method: "GET", headers });
}

/** Sort a model list by display name so it reads as a menu. */
export function sortModels<M extends { id: string; label?: string }>(
  models: M[],
): M[] {
  return [...models].sort((a, b) =>
    (a.label ?? a.id).localeCompare(b.label ?? b.id),
  );
}

/** Guard against providers that answer with an empty completion. */
export function requireText(text: string, provider: string): string {
  if (!text) throw new Error(`${provider} returned an empty response`);
  return text;
}
