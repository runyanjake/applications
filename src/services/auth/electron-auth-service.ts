import type { AuthService, AuthTokens, AuthUser } from "../../types/auth";
import { setGoogleAccessToken } from "./access-token";
import { createLogger } from "../../utils/logger";

const log = createLogger("electron-auth");

/**
 * Desktop auth service using Electron IPC for loopback OAuth.
 * Tokens are securely stored via main process safeStorage.
 */
export class ElectronAuthService implements AuthService {
  async login(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    log.info("Starting OAuth login flow");
    const result = await window.electronAPI.auth.login();
    setGoogleAccessToken(result.tokens.accessToken);
    log.info("OAuth login successful", { userId: result.user.id });
    return result;
  }

  async logout(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    log.info("Logging out");
    await window.electronAPI.auth.logout();
    setGoogleAccessToken(null);
  }

  async refreshToken(): Promise<AuthTokens> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }

    log.info("Refreshing access token");
    const tokens = await window.electronAPI.auth.refreshToken();
    setGoogleAccessToken(tokens.accessToken);
    return tokens;
  }
}
