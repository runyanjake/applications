# Applications
A bring-your-own-data, bring-your-own-LLM job application tracking site.
Gain insights through an analytics breakdown, and optimize your application pipeline via integrations with major AI providers.

## Tech Stack
- **Frontend:** React + TypeScript (Vite)
- **Storage:** Google Sheets (via Google Sheets API) — one sheet named `Applications`, columns A–R
- **Charts:** [Apache ECharts](https://echarts.apache.org/) via `echarts-for-react`
  - Donut breakdowns, status timeline, and a pipeline Sankey
  - The status timeline is downsampled to day/week/month buckets in the user's timezone
    ([date-fns](https://date-fns.org/) + `@date-fns/tz`), with a choice of aggregation:
    count at end of period, peak during period, or moves into each status
  - The Sankey supports node dragging and path highlighting on the analytics page
  - ECharts is code-split: it only downloads when you open Analytics or Report
- **AI:** Bring-your-own LLM — Gemini, OpenAI, Anthropic (via CORS proxy), or any OpenAI-compatible endpoint.
  Nothing LLM-related is deployed with the app; see [Bring Your Own LLM](#bring-your-own-llm)

## Logging
Client events are posted to `/api/logs`, which nginx proxies to a small **log sink**
(`server/`, Node + winston). The sink writes newline-delimited JSON to
`/app/logs`, mounted from `${LOG_DIR}` (default `/pwspool/software/applications/logs`):

```
applications-2026-09-07.log
applications-2026-09-08.log   <- one file per UTC day
```

Rotation is time based (`LOG_ROTATE_FREQUENCY`, default `1d`) and retention is expressed in
days (`LOG_RETENTION`, default `30d`), so files older than the window are deleted automatically.
No logrotate or cron is involved.

Every event is fanned out to **both** destinations at once — the rotating file *and* the
container's stdout/stderr — so the same stream is visible live without touching the volume:

```bash
docker logs -f applications-logger
03:18:20.649 INFO  [applications] application.created {"data":{"id":"a1","company":"Acme"},...}
03:18:20.650 ERROR [sync] Load from spreadsheet failed: caller lacks permission (HTTP 403)
```

Errors go to stderr, everything else to stdout. Set `LOG_CONSOLE_FORMAT=json` when a log
collector consumes the docker stream; the file is always JSON regardless.

**What gets recorded**
- CRUD on applications — `application.created`, `application.updated` (field names and any
  status transition, never the field values), `application.deleted`
- Persistence — `applications.loaded`, `applications.synced`, `applications.overwritten`
- Session — `auth.signed_in`, `auth.signed_out`
- Every warning and error, including uncaught exceptions and unhandled rejections
- Debug output only when verbose logging is enabled

Each line carries a per-tab `sessionId` and the signed-in user's opaque Google account id
(`userId`) — never an email address. The sink redacts anything resembling an API key or access
token before writing, caps event and field sizes, and drops requests over 64 KB.

Logging is best effort: if the sink is unreachable the client retries a few times, then stops
for that session. The app itself is unaffected.

**Log level**
`LOG_LEVEL` (`debug`, `info`, `warn` or `error`; default `info`) is read when the containers
start, so changing it needs a container recreate, not a rebuild. It applies to both sides:
- the log sink drops anything below it
- the browser client gets it from `/config.js`, which nginx renders from the container
  environment at startup; events below the level are neither printed nor shipped

It is deployment configuration only — there is no in-app switch. `npm run dev` always logs at
`debug`.

CI gates on this: the pipeline waits for the `logger` container to report healthy and POSTs a
`ci.smoke` event through nginx, so a broken sink fails the build instead of crash-looping in
production. Each successful deploy therefore leaves a `ci.smoke` marker in that day's file.

```bash
# tail today's log on the host
tail -f /pwspool/software/applications/logs/applications-$(date -u +%F).log

# just the CRUD trail
jq -c 'select(.scope == "applications")' /pwspool/software/applications/logs/*.log

# just errors
jq -c 'select(.level == "error")' /pwspool/software/applications/logs/*.log
```

## Layout
```
src/
  components/
    ui/            presentational primitives (button, card, alert, field, icons, ...)
    charts/        ECharts wrappers built on a shared frame + theme
    applications/  table, form, filters, badges
    storage/       spreadsheet picker, setup screen, sheet-creation prompt
    sync/          sync indicator + settings card
    settings/      account, AI provider, timezone
    routing/       auth gates and the spreadsheet gate
  providers/       React contexts (*-context.ts) and their providers (*-provider.tsx)
  services/        auth, storage, picker, and LLM integrations
  utils/           formatting, analytics, sync, logging, error decoding
server/            log sink: HTTP ingest + winston daily-rotate transport
```

## Google Cloud Setup
The project behind `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` needs **all three** APIs enabled:

| API | Used for |
| --- | --- |
| Google Sheets API | reading and writing application data |
| Google Drive API | listing spreadsheets in the picker |
| Google Picker API | rendering the picker dialog itself |

If the API key has HTTP-referrer restrictions, the deployment's origin must be listed, and the
OAuth client's authorized JavaScript origins must include it too.

## Troubleshooting
The app surfaces Google's actual error text rather than failing silently:
- **Applications will not load** — the page shows the API error with a Retry button.
- A missing Picker dialog almost always means the Google Picker API is not enabled.
- For more detail, redeploy with `LOG_LEVEL=debug`, which turns on `[storage]`, `[sync]`,
  `[sheets]`, `[picker]`, `[auth]` and `[llm]` debug output. Warnings and errors are always logged
  unless the level is raised above them.

## Bring Your Own LLM
The app does not ship or deploy a model. Each user picks a provider in
**Settings → AI Provider** and the browser talks to it directly:

| Provider | Needs |
| --- | --- |
| Google Gemini | API key |
| OpenAI | API key; optional base URL for OpenAI-compatible hosts |
| Anthropic | API key and a CORS proxy base URL |
| Self-hosted (OpenAI-compatible) | full chat completions URL, e.g. `http://localhost:1234/v1/chat/completions` |

**Discover** asks the provider's model-listing endpoint (`GET /models`) which models the key or
server can use and turns the Model field into a picker. For LM Studio it also shows whether each
model is loaded or only downloaded. **Enter a model name manually…** switches back to free text.

Every AI request is a fresh single-turn chat: the system prompt from
`src/prompts/extract-job-posting.md` plus one user message holding the pasted posting, with runs
of whitespace collapsed first. The prompt only extracts fields; it does not summarize, so Notes
is left for the user to fill in. No conversation history is kept or resent.

### Self-hosting with LM Studio
1. Download a chat-focused model in LM Studio.
2. In the server tab, load the model and start the server. Enable CORS (off by default).
3. The app sends a JSON schema as structured output (Server > Inference > Structured Output).
   Raise the context length if needed (Server > Load > Context And Offload > Context Length) —
   the 2k and 4k defaults were too small for long postings.

## Running (Local)
```bash
cp .env.example .env   # fill in your Google credentials
npm install
npm run dev

# optional, in a second shell: the log sink, writing to ./logs
npm --prefix server install && npm run logs
```
The dev server proxies `/api/logs` to `127.0.0.1:8080`. Without the sink running, log
shipping quietly disables itself after a few attempts.

## Running (Prod)
```bash
docker compose down && docker system prune -af && docker compose up -d
docker logs -f applications-logger   # live application + error events
```
The build fails fast if `VITE_GOOGLE_CLIENT_ID` or `VITE_GOOGLE_API_KEY` is missing, since Vite
inlines both at build time and a bundle without them cannot reach Google.

Deploys normally go through the Jenkins pipeline (`Jenkinsfile`), which lints and type-checks via
`docker build --target ci`, redeploys, then health-checks and smoke-tests both containers.

This brings up two containers: `applications` (nginx + the built SPA, published through Traefik)
and `applications-logger` (the log sink, reachable only on the private `applications`
bridge network). The log directory on the host must exist and be writable by the container:

```bash
sudo mkdir -p /pwspool/software/applications/logs
```
