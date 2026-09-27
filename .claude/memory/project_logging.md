---
name: Application Logging — File Logger
description: Renderer logs are batched over IPC to the Electron main process, which writes daily-rotated NDJSON files under userData/logs.
type: project
---

**Path:** renderer `createLogger(scope)` → `src/utils/log-transport.ts` batches events →
`window.electronAPI.log.write` (IPC `log:write`) → `electron/main/file-logger.ts` →
`<userData>/logs/app-YYYY-MM-DD.log` (macOS: `~/Library/Application Support/job-application-tracker/logs/`).

**Key decisions**
- Daily files, split at 10 MB, 7 most recent kept.
- Level: debug in dev, info in builds (`import.meta.env.DEV`). Never add a user-facing toggle or
  `localStorage` debug flag.
- Events carry a per-window `sessionId` and the opaque Google `sub` as `userId` — never the email.
- `log.audit(event, data)` records CRUD (`application.created` / `.updated` / `.deleted`).
  Updates log changed *field names* only, never the values the user typed.
- Unlike the old server-side log sink, the file logger does not redact secrets, so never log
  tokens or API keys. `llm-http.ts` strips the query string (Gemini keys) from error messages.

**How to apply:** new significant events go through `log.audit()`, not `console.*`. Anything in an
audit payload lands in a file on disk — keep free-text user content out of it.
