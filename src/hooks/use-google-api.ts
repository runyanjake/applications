import { useEffect, useState } from "react";
import { ENV } from "../config/env";
import { SHEETS_DISCOVERY_DOC } from "../config/google";

/**
 * Module-level singleton — the initialization sequence runs exactly once
 * regardless of how many times the hook mounts/unmounts (StrictMode safe).
 * On failure the singleton is cleared so a retry can re-attempt.
 */
let initPromise: Promise<void> | null = null;

function initGoogleApi(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = waitForScripts()
    .then(() => loadGapiModules("client:picker"))
    .then(() =>
      window.gapi.client.init({
        apiKey: ENV.googleApiKey,
        discoveryDocs: [SHEETS_DISCOVERY_DOC],
      }),
    )
    .catch((err: unknown) => {
      // Clear singleton so a retry can re-attempt initialization
      initPromise = null;
      throw err;
    });

  return initPromise;
}

/** Poll for the external script globals (gapi + gsi). */
function waitForScripts(): Promise<void> {
  if (window.gapi && window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const tick = 100;
    const maxWait = 15_000;

    const id = setInterval(() => {
      elapsed += tick;
      if (window.gapi && window.google?.accounts?.oauth2) {
        clearInterval(id);
        resolve();
      } else if (elapsed >= maxWait) {
        clearInterval(id);
        const missing = [
          !window.gapi && "gapi",
          !window.google?.accounts?.oauth2 && "gsi",
        ]
          .filter(Boolean)
          .join(", ");
        reject(
          new Error(
            `Google API scripts failed to load (${missing}). Check your network or ad blocker.`,
          ),
        );
      }
    }, tick);
  });
}

/** Wrap gapi.load in a Promise with onerror/ontimeout. */
function loadGapiModules(modules: string): Promise<void> {
  return new Promise((resolve, reject) => {
    window.gapi.load(modules, {
      callback: () => resolve(),
      onerror: () =>
        reject(
          new Error(
            "Failed to load Google API modules. Check your network or ad blocker.",
          ),
        ),
      timeout: 10_000,
      ontimeout: () =>
        reject(
          new Error("Google API modules timed out. Check your network."),
        ),
    });
  });
}

/**
 * Extract a human-readable message from gapi rejection values.
 * gapi.client.init rejects with plain objects, not Error instances.
 * Common shapes:
 *   { error: "idpiframe_initialization_failed", details: "..." }
 *   { error: { code: 403, message: "...", status: "..." } }
 *   { result: { error: { code: 400, message: "..." } } }
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;

    // { error: "string", details: "string" }
    if (typeof obj.details === "string") return obj.details;
    if (typeof obj.error === "string") return obj.error;

    // { error: { message: "string" } }
    if (obj.error && typeof obj.error === "object") {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === "string") return inner.message;
    }

    // { result: { error: { message: "string" } } }
    if (obj.result && typeof obj.result === "object") {
      const result = obj.result as Record<string, unknown>;
      if (result.error && typeof result.error === "object") {
        const inner = result.error as Record<string, unknown>;
        if (typeof inner.message === "string") return inner.message;
      }
    }

    // Last resort: stringify the object
    try {
      return JSON.stringify(err);
    } catch {
      // fall through
    }
  }

  return "Google API initialization failed";
}

/**
 * Hook — thin wrapper that maps the singleton promise to React state.
 * Safe under StrictMode: each mount/unmount cycle simply re-awaits
 * the same shared promise.
 */
export function useGoogleApi() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setError(null);
    setIsReady(false);
    initGoogleApi()
      .then(() => setIsReady(true))
      .catch((err: unknown) => {
        console.error("[google-api] Init failed:", err);
        setError(extractErrorMessage(err));
      });
  };

  useEffect(() => {
    let cancelled = false;

    if (!ENV.googleApiKey) {
      setError("VITE_GOOGLE_API_KEY is not set. Check your .env file.");
      return;
    }

    initGoogleApi()
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((err: unknown) => {
        console.error("[google-api] Init failed:", err);
        if (!cancelled) {
          setError(extractErrorMessage(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, error, retry };
}
