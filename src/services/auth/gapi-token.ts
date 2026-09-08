/**
 * The gapi client keeps its own copy of the OAuth token, separate from React
 * state. Every path that is about to make a Sheets call sets it first: React
 * effects run child-before-parent, so a data-loading child can otherwise fire
 * a request before the AuthProvider above it has installed the token.
 */
export function setGapiAccessToken(accessToken: string | null): void {
  const client = window.gapi?.client;
  if (!client) return;
  client.setToken(accessToken ? { access_token: accessToken } : null);
}
