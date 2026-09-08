import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/auth-provider";
import { StorageProvider } from "./providers/storage-provider";
import { ApplicationProvider } from "./providers/application-provider";
import { GoogleApiGate } from "./components/routing/google-api-gate";
import { App } from "./app";
import { installLogFlushHandlers } from "./utils/log-transport";
import { createLogger } from "./utils/logger";
import "./index.css";

const log = createLogger("app");

installLogFlushHandlers();

// Anything that escapes a component still reaches the log files
window.addEventListener("error", (event) => {
  log.error("Uncaught error:", event.message, event.error ?? "");
});
window.addEventListener("unhandledrejection", (event) => {
  log.error("Unhandled promise rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleApiGate>
        <AuthProvider>
          <StorageProvider>
            <ApplicationProvider>
              <App />
            </ApplicationProvider>
          </StorageProvider>
        </AuthProvider>
      </GoogleApiGate>
    </BrowserRouter>
  </StrictMode>,
);
