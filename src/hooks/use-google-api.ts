import { useEffect, useState } from "react";
import { ENV } from "../config/env";
import { SHEETS_DISCOVERY_DOC } from "../config/google";

export function useGoogleApi() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      const interval = setInterval(() => {
        if (cancelled) {
          clearInterval(interval);
          return;
        }
        if (window.gapi && window.google?.accounts?.oauth2) {
          clearInterval(interval);
          window.gapi.load("client:picker", async () => {
            try {
              await window.gapi.client.init({
                apiKey: ENV.googleApiKey,
                discoveryDocs: [SHEETS_DISCOVERY_DOC],
              });
              if (!cancelled) setIsReady(true);
            } catch (err) {
              console.error("Failed to init gapi client:", err);
            }
          });
        }
      }, 100);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady };
}
