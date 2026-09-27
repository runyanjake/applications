interface RequestInitJson {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** LLM requests go through the main process: no CSP or CORS limits there. */
async function requestJson<T>(
  provider: string,
  url: string,
  init: RequestInitJson,
): Promise<T> {
  let response: { ok: boolean; status: number; body: string };
  try {
    response = await window.electronAPI.llm.request({ url, ...init });
  } catch (err) {
    // Network failure. The query is dropped: it can carry an API key.
    throw new Error(
      `Could not reach the ${provider} endpoint at ${url.split("?")[0]}. Check the URL and that the server is running. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  if (!response.ok) {
    throw new Error(`${provider} API error (${response.status}): ${response.body}`);
  }
  return JSON.parse(response.body) as T;
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
