import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  session,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import {
  startOAuthServer,
  refreshAccessToken,
  type TokenResponse,
} from "./oauth-server";
import {
  SecureStorage,
  type StoredTokens,
  type StoredUser,
} from "./secure-storage";
import { FileLogger, type LogEvent } from "./file-logger";

// Google OAuth configuration
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
const OAUTH_REDIRECT_PORT = 8085;

// Credentials are inlined from .env at build time (see env.d.ts)
function getCredentials() {
  return {
    clientId: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID || "",
    clientSecret: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET || "",
  };
}

// Refresh this far ahead of expiry so a restored token is still usable
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

let mainWindow: BrowserWindow | null = null;
const logger = new FileLogger();
const secureStorage = new SecureStorage();

// Spreadsheet storage path
const spreadsheetStoragePath = join(
  app.getPath("userData"),
  "spreadsheet.json"
);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Open DevTools in development
  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

// Fetch user info from Google
async function fetchUserInfo(accessToken: string): Promise<StoredUser> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const info = (await response.json()) as GoogleUserInfo;
  return {
    id: info.sub,
    email: info.email,
    name: info.name,
    avatarUrl: info.picture,
  };
}

interface LlmRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface LlmResponse {
  ok: boolean;
  status: number;
  body: string;
}

// Register IPC handlers
function registerIpcHandlers(): void {
  const credentials = getCredentials();

  // Exchange the stored refresh token for a new access token and persist it
  async function refreshStoredTokens(): Promise<StoredTokens> {
    const stored = secureStorage.loadTokens();
    if (!stored?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokens = await refreshAccessToken(stored.refreshToken, {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    });

    const newStored = {
      accessToken: tokens.access_token,
      refreshToken: stored.refreshToken, // Keep existing refresh token
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    secureStorage.saveTokens(newStored);
    return newStored;
  }

  // Auth: Login
  ipcMain.handle("auth:login", async () => {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error(
        "Google OAuth client is not configured. Set MAIN_VITE_GOOGLE_CLIENT_ID and MAIN_VITE_GOOGLE_CLIENT_SECRET in .env and rebuild."
      );
    }

    const config = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      scopes: GOOGLE_SCOPES,
      redirectPort: OAUTH_REDIRECT_PORT,
    };

    const tokens: TokenResponse = await startOAuthServer(config);

    // Fetch user info
    const userInfo = await fetchUserInfo(tokens.access_token);

    const storedTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token!,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    secureStorage.saveTokens(storedTokens);
    secureStorage.saveUser(userInfo);

    return {
      user: userInfo,
      tokens: {
        accessToken: storedTokens.accessToken,
        expiresAt: storedTokens.expiresAt,
      },
    };
  });

  // Auth: Logout
  ipcMain.handle("auth:logout", async () => {
    const tokens = secureStorage.loadTokens();
    if (tokens?.accessToken) {
      // Revoke token with Google (best effort)
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
        { method: "POST" }
      ).catch(() => {});
    }
    secureStorage.clearTokens();
    secureStorage.clearUser();
    // Drop any Google web session a page may have set, so the next sign-in
    // starts clean. Other storage (e.g. LLM settings) is kept.
    await session.defaultSession.clearStorageData({ storages: ["cookies"] });
  });

  // Auth: Refresh token
  ipcMain.handle("auth:refresh", async () => {
    const tokens = await refreshStoredTokens();
    return {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
    };
  });

  // Auth: Get stored session, refreshing the access token if it has expired
  ipcMain.handle("auth:get-session", async () => {
    let tokens = secureStorage.loadTokens();
    const user = secureStorage.loadUser();

    if (!tokens || !user) {
      return null;
    }

    if (tokens.expiresAt - Date.now() < TOKEN_EXPIRY_MARGIN_MS) {
      try {
        tokens = await refreshStoredTokens();
      } catch (err) {
        // Refresh token revoked or expired (7-day limit in Testing mode)
        logger.log([
          {
            ts: new Date().toISOString(),
            level: "warn",
            scope: "main",
            message: `Stored session refresh failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
        return null;
      }
    }

    return {
      user,
      tokens: {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    };
  });

  // LLM: proxy requests from the main process so they aren't subject to the
  // renderer's CSP or CORS (self-hosted servers rarely send CORS headers).
  // Network failures reject; HTTP errors resolve with ok: false.
  ipcMain.handle(
    "llm:request",
    async (_: IpcMainInvokeEvent, req: LlmRequest): Promise<LlmResponse> => {
      const protocol = new URL(req.url).protocol;
      if (protocol !== "http:" && protocol !== "https:") {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }

      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      return {
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      };
    }
  );

  // Log: Write events
  ipcMain.on("log:write", (_: IpcMainInvokeEvent, events: LogEvent[]) => {
    logger.log(events);
  });

  // Storage: Save spreadsheet info
  ipcMain.on(
    "storage:save-spreadsheet",
    (_: IpcMainInvokeEvent, info: { id: string; name: string }) => {
      writeFileSync(spreadsheetStoragePath, JSON.stringify(info));
    }
  );

  // Storage: Load spreadsheet info
  ipcMain.on("storage:load-spreadsheet", (event) => {
    try {
      if (existsSync(spreadsheetStoragePath)) {
        event.returnValue = JSON.parse(
          readFileSync(spreadsheetStoragePath, "utf-8")
        );
      } else {
        event.returnValue = null;
      }
    } catch {
      event.returnValue = null;
    }
  });

  // Storage: Clear spreadsheet info
  ipcMain.on("storage:clear-spreadsheet", () => {
    if (existsSync(spreadsheetStoragePath)) {
      unlinkSync(spreadsheetStoragePath);
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId("com.applications.tracker");

  // Watch for window shortcuts in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Register IPC handlers
  registerIpcHandlers();

  // Create window
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
