import { useCallback, useEffect, useRef, useState } from "react";
import { ENV } from "../config/env";
import { SHEETS_DISCOVERY_DOC } from "../config/google";
import { describeGoogleError } from "../utils/google-error";
import { createLogger } from "../utils/logger";

const log = createLogger("google-api");

const SCRIPT_WAIT_MS = 15_000;
const MODULE_LOAD_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;

/**
 * Module-level singleton — the initialization sequence runs exactly once
 * however many times the hook mounts (StrictMode safe). On failure the
 * singleton is cleared so a retry can re-attempt.
 */
let initPromise: Promise<void> | null = null;

function scriptsReady(): boolean {
  return Boolean(window.gapi && window.google?.accounts?.oauth2);
}

/** Poll for the externally-loaded script globals (gapi + GSI). */
function waitForScripts(): Promise<void> {
  if (scriptsReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;
      if (scriptsReady()) {
        clearInterval(id);
        resolve();
        return;
      }
      if (elapsed >= SCRIPT_WAIT_MS) {
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
    }, POLL_INTERVAL_MS);
  });
}

/** Promise wrapper around gapi.load, which is callback-based. */
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
      timeout: MODULE_LOAD_TIMEOUT_MS,
      ontimeout: () =>
        reject(new Error("Google API modules timed out. Check your network.")),
    });
  });
}

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
      initPromise = null; // let a retry start over
      throw err;
    });

  return initPromise;
}

/** Maps the shared initialization promise onto React state. */
export function useGoogleApi() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback(() => {
    initGoogleApi()
      .then(() => {
        if (mounted.current) setIsReady(true);
      })
      .catch((err: unknown) => {
        log.error("Init failed:", err);
        if (mounted.current) setError(describeGoogleError(err));
      });
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setIsReady(false);
    start();
  }, [start]);

  useEffect(() => {
    if (!ENV.googleApiKey) {
      setError("VITE_GOOGLE_API_KEY is not set. Check your .env file.");
      return;
    }
    start();
  }, [start]);

  return { isReady, error, retry };
}
