import type { AuthTokens, AuthUser } from "../../types/auth";
import { setGoogleAccessToken } from "./access-token";
import { createLogger } from "../../utils/logger";

const log = createLogger("electron-auth");

/** Loopback OAuth runs in the main process; tokens live in its safeStorage. */
export class ElectronAuthService {
  async login(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    log.info("Starting OAuth login flow");
    const result = await window.electronAPI.auth.login();
    setGoogleAccessToken(result.tokens.accessToken);
    log.info("OAuth login successful", { userId: result.user.id });
    return result;
  }

  async logout(): Promise<void> {
    log.info("Logging out");
    await window.electronAPI.auth.logout();
    setGoogleAccessToken(null);
  }

  async refreshToken(): Promise<AuthTokens> {
    log.info("Refreshing access token");
    const tokens = await window.electronAPI.auth.refreshToken();
    setGoogleAccessToken(tokens.accessToken);
    return tokens;
  }
}
