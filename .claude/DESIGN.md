# Design Notes

Background for the README. Code-level decisions and gotchas live in `.claude/memory/`.

## Code Layout
- `electron/main/`: main process: loopback OAuth, `safeStorage` tokens, file logger, LLM request proxy
- `electron/preload/`: the `window.electronAPI` IPC bridge (CommonJS, sandboxed)
- `src/components/`: UI grouped by area: `ui`, `charts`, `applications`, `storage`, `sync`, `settings`, `routing`
- `src/providers/`: React contexts (`*-context.ts`) and their providers (`*-provider.tsx`)
- `src/services/`: auth, Google REST calls (Sheets, Drive), and one LLM client per provider
- `src/utils/`: formatting, analytics, the time series, sync and logging
- `src/prompts/`: the system prompt sent to the LLM

## Google APIs
- Sign-in runs in the main process: system browser → `127.0.0.1:8085` loopback → token exchange.
  Tokens are encrypted with `safeStorage`; the renderer only ever sees the access token.
- The renderer calls the Sheets and Drive REST APIs with `fetch` and a bearer token. No Google
  scripts are loaded; the CSP only allows `sheets.googleapis.com` and `www.googleapis.com`.
- Spreadsheets are chosen in an in-app dialog backed by Drive `files.list`. The Google Picker can't
  be used: it needs a Google web session, and Google blocks sign-in inside embedded windows.

## Storage
There is one Google Sheet tab, `Applications`, with columns A–R. Column R holds each application's
status history as a JSON list of `{ts, from, to}` events. Writes use `RAW` mode so Sheets doesn't
reinterpret the JSON.

## LLM Requests
- Requests are proxied through the main process (`llm:request` IPC), so the renderer's CSP and
  CORS don't apply to cloud or self-hosted endpoints.
- Each request is a fresh single-turn chat: the system prompt `src/prompts/extract-job-posting.md`
  plus the pasted posting, with runs of whitespace collapsed. No conversation history is kept.
- The model extracts the form fields and writes Notes as a "- " bulleted list: a 1–2 sentence overview plus one bullet per notable
  requirement (unusual stack, named tools, certifications), skipping standard items.
- OpenAI-compatible requests include a JSON schema as `response_format`. Local servers get
  plain types; OpenAI gets nullable fields, as its strict mode requires.
- The response is cleaned before use: code fences and `<think>` blocks are stripped, unknown keys
  are dropped, and city/state/country become de-duplicated comma-separated lists of names and codes.
- **Discover** calls the provider's model list (`GET /models`). For LM Studio it tries
  `/api/v0/models` first, which reports whether each model is loaded.

## Status Time Series
The history events are replayed into one point per calendar bucket (day, week or month) in the
user's timezone, using `date-fns` and `@date-fns/tz`. Three aggregations are offered: count at
the end of the period, peak during the period, and moves into each status. Empty buckets carry the
previous value forward, following the OpenTSDB model of interval, aggregator and fill.

## Logging
- **Path:** renderer `createLogger(scope)` → batched `log:write` IPC → main process →
  newline-delimited JSON in `<userData>/logs/app-YYYY-MM-DD.log`.
- **Rotation:** daily files, split at 10 MB, 7 most recent kept.
- **Level:** debug in `npm run dev`, info in builds. There is no in-app switch.
- **Audit events:** `application.created`/`.updated`/`.deleted`, `applications.loaded`/`.synced`/`.overwritten`,
  `auth.signed_in`/`.signed_out`. Updates record changed field names only, never the values.
- **Privacy:** events carry a per-window `sessionId` and the opaque Google `userId`, never an email.
