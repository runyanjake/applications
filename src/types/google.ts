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
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  interface Window {
    gapi: {
      load(api: string, callback: () => void): void;
      client: {
        init(config: {
          apiKey: string;
          discoveryDocs: string[];
        }): Promise<void>;
        getToken(): { access_token: string } | null;
        setToken(token: { access_token: string } | null): void;
        sheets: {
          spreadsheets: {
            values: {
              get(params: {
                spreadsheetId: string;
                range: string;
              }): Promise<{ result: { values?: string[][] } }>;
              append(params: {
                spreadsheetId: string;
                range: string;
                valueInputOption: string;
                resource: { values: string[][] };
              }): Promise<unknown>;
              update(params: {
                spreadsheetId: string;
                range: string;
                valueInputOption: string;
                resource: { values: string[][] };
              }): Promise<unknown>;
            };
            get(params: {
              spreadsheetId: string;
            }): Promise<{
              result: {
                sheets?: Array<{
                  properties?: { sheetId?: number; title?: string };
                }>;
              };
            }>;
            batchUpdate(params: {
              spreadsheetId: string;
              resource: { requests: unknown[] };
            }): Promise<unknown>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient;
          revoke(token: string, callback?: () => void): void;
        };
      };
      picker: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: { SPREADSHEETS: string };
        DocsView: new (viewId: string) => DocsView;
        Action: { PICKED: string; CANCEL: string };
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
    build(): { setVisible(visible: boolean): void };
  }

  interface DocsView {
    setIncludeFolders(include: boolean): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
  }
}

export {};
