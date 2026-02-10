import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/auth-provider";
import { StorageProvider } from "./providers/storage-provider";
import { ApplicationProvider } from "./providers/application-provider";
import { GoogleApiGate } from "./components/routing/google-api-gate";
import { App } from "./app";
import "./index.css";

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
