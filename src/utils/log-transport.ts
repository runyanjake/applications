/**
 * Ships log events to the log-sink service (`/api/logs`), which writes the
 * rotating files. Best effort by design: the app must work identically when
 * the sink is unreachable, so failures disable the transport rather than
 * surfacing anywhere.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RemoteLogEvent {
  ts: string;
  level: LogLevel;
  scope: string;
  /** Set for audit events (`application.created`, ...). */
  event?: string;
  message: string;
  data?: Record<string, unknown>;
}

const ENDPOINT = "/api/logs";
const FLUSH_INTERVAL_MS = 5_000;
/** Matches the server's per-request cap. */
const MAX_BATCH = 50;
const MAX_QUEUE = 200;
/** Stop trying after this many consecutive failures (e.g. sink not deployed). */
const MAX_FAILURES = 3;
const SESSION_ID_KEY = "jat:log-session";

let queue: RemoteLogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let disabled = false;
let userId: string | null = null;

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Stable for the life of the tab so a session's events can be correlated. */
function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = randomId();
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return "no-session-storage";
  }
}

/** Attach the signed-in user's opaque Google id (never their email). */
export function setLogUser(id: string | null): void {
  userId = id;
}

function payload(events: RemoteLogEvent[]): string {
  return JSON.stringify({
    sessionId: sessionId(),
    userId,
    events,
  });
}

function flush(useBeacon = false): void {
  if (disabled || queue.length === 0) return;

  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);

  const body = payload(batch);

  // On page hide only sendBeacon is guaranteed to complete
  if (useBeacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      ENDPOINT,
      new Blob([body], { type: "application/json" }),
    );
    return;
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      failures = 0;
    })
    .catch(() => {
      failures += 1;
      if (failures >= MAX_FAILURES) {
        disabled = true;
        queue = [];
      }
    });

  if (queue.length > 0) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

export function enqueueLogEvent(event: RemoteLogEvent): void {
  if (disabled) return;
  queue.push(event);
  // Drop the oldest events rather than growing without bound
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= MAX_BATCH) flush();
  else scheduleFlush();
}

/** Current transport state, surfaced by the Settings diagnostics panel. */
export function getLogTransportStatus(): {
  enabled: boolean;
  queued: number;
  failures: number;
  sessionId: string;
} {
  return {
    enabled: !disabled,
    queued: queue.length,
    failures,
    sessionId: sessionId(),
  };
}

/** Flush pending events while the page can still make requests. */
export function installLogFlushHandlers(): void {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}
