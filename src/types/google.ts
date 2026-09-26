export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export interface PickerDocument {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

export interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

declare global {
  interface Window {
    gapi: {
      load(
        api: string,
        callbackOrConfig:
          | (() => void)
          | {
              callback: () => void;
              onerror?: () => void;
              timeout?: number;
              ontimeout?: () => void;
            },
      ): void;
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, callback?: () => void): void;
        };
      };
      picker?: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: { SPREADSHEETS: string };
        DocsView: new (viewId: string) => DocsView;
        Action: { PICKED: string; CANCEL: string; LOADED: string };
        Feature: { NAV_HIDDEN: string };
      };
    };
  }

  interface PickerBuilder {
    addView(view: DocsView): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setCallback(
      callback: (data: {
        action: string;
        docs?: Array<{
          id: string;
          name: string;
          mimeType: string;
          url: string;
        }>;
      }) => void,
    ): PickerBuilder;
    build(): PickerInstance;
  }

  interface PickerInstance {
    setVisible(visible: boolean): void;
    /** Removes the picker's DOM nodes; required before opening another one. */
    dispose(): void;
  }

  interface DocsView {
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
  }
}

export {};
