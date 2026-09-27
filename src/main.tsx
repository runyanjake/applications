import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./providers/auth-provider";
import { StorageProvider } from "./providers/storage-provider";
import { ApplicationProvider } from "./providers/application-provider";
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

// HashRouter: the packaged renderer loads from file://
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <StorageProvider>
          <ApplicationProvider>
            <App />
          </ApplicationProvider>
        </StorageProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
