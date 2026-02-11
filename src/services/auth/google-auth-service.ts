import type { AuthService, AuthTokens, AuthUser } from "../../types/auth";
import type {
  GoogleTokenResponse,
  GoogleUserInfo,
  TokenClient,
} from "../../types/google";
import { ENV } from "../../config/env";
import { GOOGLE_SCOPES, USERINFO_ENDPOINT } from "../../config/google";

/**
 * Google Identity Services best practice: call initTokenClient ONCE
 * and reuse the client for all token requests. The callback/error_callback
 * are invoked per-request; we swap the Promise handlers via instance fields.
 */
export class GoogleAuthService implements AuthService {
  private tokenClient: TokenClient | null = null;
  private pendingResolve:
    | ((r: { access_token: string; expires_in: number }) => void)
    | null = null;
  private pendingReject: ((err: Error) => void) | null = null;

  private ensureTokenClient(): TokenClient {
    if (this.tokenClient) return this.tokenClient;

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: ENV.googleClientId,
      scope: GOOGLE_SCOPES,
      callback: (response: GoogleTokenResponse) => {
        if (response.error) {
          this.pendingReject?.(new Error(response.error));
        } else {
          this.pendingResolve?.({
            access_token: response.access_token,
            expires_in: response.expires_in,
          });
        }
        this.pendingResolve = null;
        this.pendingReject = null;
      },
      error_callback: (error) => {
        const msg = error.message || error.type || "OAuth error";
        console.error("[auth] GSI error:", error);
        this.pendingReject?.(new Error(msg));
        this.pendingResolve = null;
        this.pendingReject = null;
      },
    });

    return this.tokenClient;
  }

  async login(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const tokenResponse = await this.requestToken("consent");
    const tokens: AuthTokens = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    window.gapi.client.setToken({
      access_token: tokenResponse.access_token,
    });

    const user = await this.fetchUserInfo(tokens.accessToken);
    return { user, tokens };
  }

  async logout(): Promise<void> {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken(null);
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const tokenResponse = await this.requestToken("");
    const tokens: AuthTokens = {
      accessToken: tokenResponse.access_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    };

    window.gapi.client.setToken({
      access_token: tokenResponse.access_token,
    });

    return tokens;
  }

  private requestToken(
    prompt: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.ensureTokenClient().requestAccessToken({ prompt });
    });
  }

  private async fetchUserInfo(accessToken: string): Promise<AuthUser> {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to fetch user info");
    const info: GoogleUserInfo = await res.json();
    return {
      id: info.sub,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
    };
  }
}
