interface RequestInitJson {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Send the request from the renderer, or in Electron via the main process so it
 * bypasses the page CSP and CORS. Normalized to what requestJson needs.
 */
async function send(
  url: string,
  init: RequestInitJson,
): Promise<{ ok: boolean; status: number; text(): Promise<string> }> {
  if (window.electronAPI) {
    const res = await window.electronAPI.llm.request({ url, ...init });
    return { ok: res.ok, status: res.status, text: async () => res.body };
  }
  return fetch(url, init);
}

/** Shared request plumbing for the LLM providers. */
async function requestJson<T>(
  provider: string,
  url: string,
  init: RequestInitJson,
): Promise<T> {
  let response: Awaited<ReturnType<typeof send>>;
  try {
    response = await send(url, init);
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
  return JSON.parse(await response.text()) as T;
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
