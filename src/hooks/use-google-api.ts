import { useCallback, useEffect, useRef, useState } from "react";
import { ENV } from "../config/env";
import { describeGoogleError } from "../utils/google-error";
import { createLogger } from "../utils/logger";

const log = createLogger("google-api");

const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
const MODULE_LOAD_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 100;

/**
 * Loads the browser-only Google scripts: GSI for sign-in and gapi for the
 * Picker. Sheets calls go straight to the REST API, so the Electron app (which
 * signs in and shows the Picker from the main process) loads nothing remotely.
 *
 * Module-level singleton — the initialization sequence runs exactly once
 * however many times the hook mounts (StrictMode safe). On failure the
 * singleton is cleared so a retry can re-attempt.
 */
let initPromise: Promise<void> | null = null;

/** Load a script dynamically and return a promise. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);

    // Timeout fallback
    setTimeout(() => {
      reject(new Error(`Script load timed out: ${src}`));
    }, SCRIPT_LOAD_TIMEOUT_MS);
  });
}

function scriptsReady(): boolean {
  return Boolean(window.gapi && window.google?.accounts?.oauth2);
}

/** Load and wait for Google script globals. */
async function loadAndWaitForScripts(): Promise<void> {
  if (!window.gapi) {
    await loadScript("https://apis.google.com/js/api.js");
  }
  if (!window.google?.accounts?.oauth2) {
    await loadScript("https://accounts.google.com/gsi/client");
  }

  // Poll until ready
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += POLL_INTERVAL_MS;
      if (scriptsReady()) {
        clearInterval(id);
        resolve();
        return;
      }
      if (elapsed >= SCRIPT_LOAD_TIMEOUT_MS) {
        clearInterval(id);
        const missing = [
          !window.gapi && "gapi",
          !window.google?.accounts?.oauth2 && "gsi",
        ]
          .filter(Boolean)
          .join(", ");
        reject(
          new Error(
            `Google API scripts failed to initialize (${missing}). Check your network or ad blocker.`,
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

  initPromise = loadAndWaitForScripts()
    .then(() => loadGapiModules("picker"))
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
    // Electron needs no browser scripts: auth and the Picker run in the main process
    if (window.electronAPI) {
      setIsReady(true);
      return;
    }
    if (!ENV.googleApiKey) {
      setError("VITE_GOOGLE_API_KEY is not set. Check your .env file.");
      return;
    }
    start();
  }, [start]);

  return { isReady, error, retry };
}
