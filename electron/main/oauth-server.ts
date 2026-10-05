import { createServer, Server, IncomingMessage, ServerResponse } from "http";
import { shell } from "electron";
import { URL } from "url";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string;
  redirectPort: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export type OAuthLog = (level: "info" | "warn" | "error", message: string) => void;

// Give up on a login the user abandoned in the browser
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

let server: Server | null = null;
let loginTimeout: NodeJS.Timeout | null = null;
let rejectPending: ((err: Error) => void) | null = null;

export function startOAuthServer(
  config: OAuthConfig,
  log: OAuthLog
): Promise<TokenResponse> {
  // A previous attempt may still hold the port if its browser tab was abandoned
  if (rejectPending) {
    log("warn", "Previous sign-in attempt superseded by a new one");
  }
  rejectPending?.(new Error("Superseded by a new sign-in attempt"));
  stopOAuthServer();

  return new Promise((resolve, reject) => {
    rejectPending = reject;
    const redirectUri = `http://127.0.0.1:${config.redirectPort}/callback`;

    loginTimeout = setTimeout(() => {
      log("warn", "Sign-in timed out waiting for the browser callback");
      stopOAuthServer();
      reject(new Error("Sign-in timed out. Please try again."));
    }, LOGIN_TIMEOUT_MS);

    server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(
          req.url!,
          `http://127.0.0.1:${config.redirectPort}`
        );
        log(
          "info",
          `Loopback request received: ${req.method} ${url.pathname} (code: ${url.searchParams.has("code")}, error: ${url.searchParams.get("error") ?? "none"})`
        );

        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(
              "<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>"
            );
            stopOAuthServer();
            reject(new Error(error));
            return;
          }

          if (code) {
            try {
              const tokens = await exchangeCodeForTokens(
                code,
                config,
                redirectUri
              );
              log("info", "Token exchange succeeded");
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(
                "<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>"
              );
              stopOAuthServer();
              resolve(tokens);
            } catch (err) {
              log(
                "error",
                `Token exchange failed: ${err instanceof Error ? err.message : String(err)}`
              );
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end(
                "<html><body><h1>Token exchange failed</h1></body></html>"
              );
              stopOAuthServer();
              reject(err);
            }
          }
        }
      }
    );

    server.listen(config.redirectPort, "127.0.0.1", () => {
      // Build authorization URL
      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", config.scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      log("info", `Loopback server listening on ${redirectUri}; opening system browser`);
      shell.openExternal(authUrl.toString()).then(
        () => log("info", "System browser accepted the sign-in URL"),
        (err) =>
          log(
            "error",
            `System browser failed to open the sign-in URL: ${err instanceof Error ? err.message : String(err)}`
          )
      );
    });

    server.on("error", (err) => {
      log("error", `Loopback server error: ${err.message}`);
      stopOAuthServer();
      reject(err);
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  config: OAuthConfig,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
  config: { clientId: string; clientSecret: string }
): Promise<TokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }

  return (await response.json()) as TokenResponse;
}

export function stopOAuthServer(): void {
  rejectPending = null;
  if (loginTimeout) {
    clearTimeout(loginTimeout);
    loginTimeout = null;
  }
  if (server) {
    server.close();
    server = null;
  }
}
