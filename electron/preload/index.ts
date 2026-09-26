import { contextBridge, ipcRenderer } from "electron";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface LogEvent {
  ts: string;
  level: string;
  scope: string;
  event?: string;
  message: string;
  data?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
}

export interface LlmRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface LlmResponse {
  ok: boolean;
  status: number;
  body: string;
}

export interface ElectronAPI {
  auth: {
    login: () => Promise<{ user: AuthUser; tokens: AuthTokens }>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<AuthTokens>;
    getStoredSession: () => Promise<{
      user: AuthUser;
      tokens: AuthTokens;
    } | null>;
  };
  log: {
    write: (events: LogEvent[]) => void;
  };
  llm: {
    request: (req: LlmRequest) => Promise<LlmResponse>;
  };
  storage: {
    saveSpreadsheetInfo: (info: SpreadsheetInfo) => void;
    loadSpreadsheetInfo: () => SpreadsheetInfo | null;
    clearSpreadsheetInfo: () => void;
  };
}

const electronAPI: ElectronAPI = {
  auth: {
    login: () => ipcRenderer.invoke("auth:login"),
    logout: () => ipcRenderer.invoke("auth:logout"),
    refreshToken: () => ipcRenderer.invoke("auth:refresh"),
    getStoredSession: () => ipcRenderer.invoke("auth:get-session"),
  },
  log: {
    write: (events: LogEvent[]) => ipcRenderer.send("log:write", events),
  },
  llm: {
    request: (req: LlmRequest) => ipcRenderer.invoke("llm:request", req),
  },
  storage: {
    saveSpreadsheetInfo: (info: SpreadsheetInfo) =>
      ipcRenderer.send("storage:save-spreadsheet", info),
    loadSpreadsheetInfo: () =>
      ipcRenderer.sendSync("storage:load-spreadsheet"),
    clearSpreadsheetInfo: () =>
      ipcRenderer.send("storage:clear-spreadsheet"),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
