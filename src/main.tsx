import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
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

// Use HashRouter in Electron (file:// protocol doesn't support BrowserRouter)
const Router = window.electronAPI ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <GoogleApiGate>
        <AuthProvider>
          <StorageProvider>
            <ApplicationProvider>
              <App />
            </ApplicationProvider>
          </StorageProvider>
        </AuthProvider>
      </GoogleApiGate>
    </Router>
  </StrictMode>,
);
