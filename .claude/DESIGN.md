# Design Notes

Background for the README. Code-level decisions and gotchas live in `.claude/memory/`.

## Code Layout
- `src/components/`: UI grouped by area: `ui`, `charts`, `applications`, `storage`, `sync`, `settings`, `routing`
- `src/providers/`: React contexts (`*-context.ts`) and their providers (`*-provider.tsx`)
- `src/services/`: auth, Google Sheets storage, the file picker, and one LLM client per provider
- `src/utils/`: formatting, analytics, the time series, sync and logging
- `src/prompts/`: the system prompt sent to the LLM
- `server/`: the log sink

## Storage
There is one Google Sheet tab, `Applications`, with columns A–R. Column R holds each application's
status history as a JSON list of `{ts, from, to}` events. Writes use `RAW` mode so Sheets doesn't
reinterpret the JSON.

## LLM Requests
- Each request is a fresh single-turn chat: the system prompt `src/prompts/extract-job-posting.md`
  plus the pasted posting, with runs of whitespace collapsed. No conversation history is kept.
- The model extracts the form fields and writes Notes: a 1–2 sentence overview plus notable
  requirements (unusual stack, named tools, certifications), skipping standard items.
- OpenAI-compatible requests include a JSON schema as `response_format`. Local servers get
  plain types; OpenAI gets nullable fields, as its strict mode requires.
- The response is cleaned before use: code fences and `<think>` blocks are stripped, unknown keys
  are dropped, and city/state/country are rewritten as matching comma-separated lists of names and codes.
- **Discover** calls the provider's model list (`GET /models`). For LM Studio it tries
  `/api/v0/models` first, which reports whether each model is loaded.

## Status Time Series
The history events are replayed into one point per calendar bucket (day, week or month) in the
user's timezone, using `date-fns` and `@date-fns/tz`. Three aggregations are offered: count at
the end of the period, peak during the period, and moves into each status. Empty buckets carry the
previous value forward, following the OpenTSDB model of interval, aggregator and fill.

## Logging
- **Path:** client logger → batched `POST /api/logs` → nginx → log sink → newline-delimited JSON in `LOG_DIR`.
- **Destinations:** every event goes to both the rotating file and the container's stdout/stderr.
- **Rotation:** time-based (`LOG_ROTATE_FREQUENCY`), with retention in days (`LOG_RETENTION`).
- **Audit events:** `application.created`/`.updated`/`.deleted`, `applications.loaded`/`.synced`/`.overwritten`,
  `auth.signed_in`/`.signed_out`. Updates record changed field names only, never the values.
- **Privacy:** events carry a per-tab `sessionId` and the opaque Google `userId`, never an email.
  The sink redacts API keys and tokens and caps request size at 64 KB.
- **Log level:** `LOG_LEVEL` is read at container start. nginx renders `/config.js` from it,
  and the client reads that file. There is no in-app switch.
- **Failure handling:** shipping is best effort and turns itself off after 3 consecutive failures.
  nginx looks up the sink on each request, so a broken sink never takes the site down.
- **CI:** Jenkins waits for both containers to be healthy, checks `/config.js`, and posts a
  `ci.smoke` event through nginx.
