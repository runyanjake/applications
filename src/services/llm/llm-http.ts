/** Shared request plumbing for the LLM providers. */
export async function postJson<T>(
  provider: string,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // fetch only rejects on network/CORS failures, which are the common
    // self-hosted misconfiguration — say so rather than "Failed to fetch".
    throw new Error(
      `Could not reach the ${provider} endpoint at ${url}. Check the URL and that the server allows cross-origin requests. (${
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

/** Guard against providers that answer with an empty completion. */
export function requireText(text: string, provider: string): string {
  if (!text) throw new Error(`${provider} returned an empty response`);
  return text;
}
