/** OAuth access token for Google API calls made outside React. */
let accessToken: string | null = null;

export function setGoogleAccessToken(token: string | null): void {
  accessToken = token;
}

export function getGoogleAccessToken(): string | null {
  return accessToken;
}
