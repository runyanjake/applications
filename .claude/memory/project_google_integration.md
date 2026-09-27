---
name: Google API Integration — Gotchas
description: Desktop OAuth, REST-over-fetch instead of gapi, why the Google Picker is not used, token ordering, required GCP APIs.
type: project
---

## Auth lives in the main process

Loopback OAuth (`electron/main/oauth-server.ts`) with a **Desktop app** OAuth client; credentials
come from `MAIN_VITE_GOOGLE_CLIENT_ID`/`_SECRET` in `.env`, inlined at build time. Refresh tokens
are in `safeStorage`; `auth:get-session` refreshes an expired access token on startup. In GCP
"Testing" mode refresh tokens expire after 7 days.

## No gapi, no Google Picker

**Why:** gapi.client loads remote scripts and proxies through hidden iframes (needs a loose CSP).
The Picker needs a Google web session in the embedding window, and Google blocks sign-in inside
Electron windows (403 `disallowed_useragent`).

**How to apply:** call Google APIs through `googleFetch` (`src/services/google/google-fetch.ts`),
and add any new host to the CSP in `index.html`. Spreadsheet selection uses Drive `files.list`
(`drive-spreadsheets.ts` + `spreadsheet-chooser.tsx`). Don't reintroduce gapi or the Picker.

## Token ordering

React effects run child-before-parent, so a data-loading child can fire a Sheets request before
`AuthProvider` installs the token. Code about to call Sheets calls `setGoogleAccessToken()` first
(`src/services/auth/access-token.ts`).

## Loading must be keyed, not one-shot

`ApplicationProvider` tracks `loadedIdRef` (the spreadsheet id already loaded) and re-runs the load
when the access token arrives. Keying on the id — not the token — means a token refresh never
discards unsynced local edits. A failed load leaves `loadedIdRef` unset so it retries.

## Required GCP APIs

Sheets API and Drive API. No API key is needed. Scopes: `userinfo.email`, `userinfo.profile`,
`spreadsheets`, `drive.readonly`.

## Errors are never swallowed

`googleFetch` throws `GoogleApiError` with Google's message and HTTP status; `isAuthError` (401/403)
drives the "sign in again" UI. Surface `describeGoogleError(err)` rather than generic text.
