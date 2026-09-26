import type { AuthService } from "../../types/auth";
import { GoogleAuthService } from "./google-auth-service";
import { ElectronAuthService } from "./electron-auth-service";

export function createAuthService(): AuthService {
  // Use Electron auth when running in Electron
  if (window.electronAPI) {
    return new ElectronAuthService();
  }
  // Fallback to web GIS auth (for development in browser)
  return new GoogleAuthService();
}
