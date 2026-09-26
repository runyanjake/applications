/**
 * The current Google OAuth access token, for services that call Google APIs
 * outside React. Every path that is about to make a Sheets call sets it first:
 * React effects run child-before-parent, so a data-loading child can otherwise
 * fire a request before the AuthProvider above it has installed the token.
 */
let accessToken: string | null = null;

export function setGoogleAccessToken(token: string | null): void {
  accessToken = token;
}

export function getGoogleAccessToken(): string | null {
  return accessToken;
}
