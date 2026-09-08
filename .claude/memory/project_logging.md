---
name: Application Logging — Sink Sidecar
description: How the SPA gets file-based logs: /api/logs -> nginx -> Node log sink -> winston daily-rotate files on a mounted volume.
type: project
---

The app is a static SPA, so browser code cannot write files. File logging works through a
**second container**, not through the frontend.

**Path:** client `createLogger(scope)` → batched POST to `/api/logs` → nginx proxy →
`logger` service (`server/`, Node + `winston` + `winston-daily-rotate-file`) → newline-delimited
JSON at `/app/logs`, bind-mounted from `${LOG_DIR}` (default
`/pwspool/software/applications/logs`).

**Key decisions**
- Rotation is time based (`LOG_ROTATE_FREQUENCY`, default `1d`); retention is `maxFiles` in days
  (`LOG_RETENTION`, default `30d`). No logrotate/cron. Verified working, including pruning.
- nginx uses `resolver 127.0.0.11` with `proxy_pass $log_sink/api/logs` so the *variable* form
  defers DNS to request time — otherwise nginx refuses to start when the logger is down.
- The sink redacts `AIza…`, `ya29.…`, `Bearer …` and `key=` params before writing, caps events per
  request (50), field sizes, and body size (64 KB).
- Logs carry a per-tab `sessionId` and the opaque Google `sub` as `userId` — deliberately **not**
  the email address, since the site is multi-user.
- Client shipping is best effort: it disables itself after 3 consecutive failures so a missing
  sink never affects the app. Status is visible in Settings → Diagnostics.
- `log.audit(event, data)` records CRUD (`application.created` / `.updated` / `.deleted`).
  Updates log changed *field names* only, never the values the user typed.

**Traefik: the app container is on two networks**
Adding the private `applications` bridge network put `app` on two networks. Traefik cannot then
infer which network to reach it on, silently fails to build the service, and serves its own plain
text `404 page not found` for the whole site. The fix is the
`traefik.docker.network=traefik` label — it is required, not cosmetic. There is also no
`depends_on` between app and logger on purpose: nginx resolves the sink lazily per request, so a
broken log sink must never take the site down.

**Both transports, always**
`createFileLogger` attaches the rotating file transport *and* a Console transport, so every event
appears in `docker logs applications-logger` as well as in the file. Errors go to stderr
(`stderrLevels`). `LOG_CONSOLE_FORMAT=json` switches the console to JSON for collectors.

**CI integration (Jenkinsfile)**
- Teardown removes **both** fixed container names (`applications`, `applications-logger`);
  `docker compose down` alone does not reap them and `up` then fails with "name already in use".
- Health Check waits for `app` *and* `logger` to report healthy via a shared `wait_healthy()`
  shell function, so a broken sink fails the build.
- Smoke Test POSTs a `ci.smoke` event through nginx and asserts `"accepted":1`, which exercises
  nginx -> logger -> mounted volume. Assumes busybox `wget --post-data` (Alpine ships it).

**How to apply:** new significant events go through `log.audit()`, not `console.*`. Anything
added to an audit payload lands in a file on the host — keep free-text user content out of it.
