export interface ElectronAuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface ElectronAuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface ElectronLogEvent {
  ts: string;
  level: string;
  scope: string;
  event?: string;
  message: string;
  data?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export interface ElectronSpreadsheetInfo {
  id: string;
  name: string;
}

export interface ElectronLlmRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface ElectronLlmResponse {
  ok: boolean;
  status: number;
  body: string;
}

export interface ElectronAPI {
  auth: {
    login: () => Promise<{
      user: ElectronAuthUser;
      tokens: ElectronAuthTokens;
    }>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<ElectronAuthTokens>;
    getStoredSession: () => Promise<{
      user: ElectronAuthUser;
      tokens: ElectronAuthTokens;
    } | null>;
  };
  log: {
    write: (events: ElectronLogEvent[]) => void;
  };
  llm: {
    request: (req: ElectronLlmRequest) => Promise<ElectronLlmResponse>;
  };
  storage: {
    saveSpreadsheetInfo: (info: ElectronSpreadsheetInfo) => void;
    loadSpreadsheetInfo: () => ElectronSpreadsheetInfo | null;
    clearSpreadsheetInfo: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
