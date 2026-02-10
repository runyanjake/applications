import type { AuthService, AuthTokens, AuthUser } from "../../types/auth";
import type { GoogleUserInfo } from "../../types/google";
import { ENV } from "../../config/env";
import { GOOGLE_SCOPES, USERINFO_ENDPOINT } from "../../config/google";

export class GoogleAuthService implements AuthService {
  async login(): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const tokenResponse = await this.requestToken({ prompt: "consent" });
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
    const tokenResponse = await this.requestToken({ prompt: "" });
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
    overrides: { prompt?: string } = {},
  ): Promise<{ access_token: string; expires_in: number }> {
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: ENV.googleClientId,
        scope: GOOGLE_SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve({
            access_token: response.access_token,
            expires_in: response.expires_in,
          });
        },
      });
      client.requestAccessToken(overrides);
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
