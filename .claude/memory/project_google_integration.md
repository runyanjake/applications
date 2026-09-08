---
name: Google API Integration — Gotchas
description: Picker disposal, gapi token ordering, and which GCP APIs must be enabled for the Applications app.
type: project
---

## Picker instances must be disposed

`google.picker` leaves its dialog and backdrop in the DOM after a pick or cancel. A second
`PickerBuilder(...).setVisible(true)` then silently fails to appear — the "Change Spreadsheet does
nothing" bug. `src/services/picker/google-picker-service.ts` keeps a module-level reference to the
open picker and calls `setVisible(false)` + `dispose()` on every exit path. Never build a picker
without disposing the previous one.

## gapi holds its own token copy

React effects run child-before-parent, so a data-loading child provider can fire a Sheets request
before `AuthProvider` (above it) installs the OAuth token. Any code path about to call the Sheets
API calls `setGapiAccessToken()` from `src/services/auth/gapi-token.ts` first.

## Loading must be keyed, not one-shot

`ApplicationProvider` tracks `loadedIdRef` (the spreadsheet id already loaded) and re-runs the load
when the access token arrives. Keying on the id — not on the token — means a token refresh never
discards unsynced local edits. A failed load leaves `loadedIdRef` unset so it retries.

## Required GCP APIs

Sheets API, **Drive API**, and **Picker API** all have to be enabled on the project behind
`VITE_GOOGLE_API_KEY`. Verified 2026-09-07 against the live deployment at apply.whitney.rip: the
API key baked into the published bundle is valid and the Sheets API answers with it. So a
"nothing loads" report is not a stale key — check Drive/Picker enablement and the key's
HTTP-referrer restrictions instead.

## Errors are never swallowed

`describeGoogleError` in `src/utils/google-error.ts` decodes gapi's plain-object rejections
(`{result:{error:{code,message}}}` etc.). Surface it in the UI; don't fall back to
`err instanceof Error ? err.message : "..."`, which produces useless generic text.
Settings → Diagnostics runs live checks; `localStorage["jat:debug"]="1"` enables debug logs.
