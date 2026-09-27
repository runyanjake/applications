/** Batches log events to the main process, which writes the rotating files. */
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

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 50;
const MAX_QUEUE = 200;
const SESSION_ID_KEY = "jat:log-session";

let queue: RemoteLogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let userId: string | null = null;

/** Stable per window session, to correlate its events. */
function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return "no-session-storage";
  }
}

/** Tag events with the opaque Google account id (never the email). */
export function setLogUser(id: string | null): void {
  userId = id;
}

function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(batch.length);

  window.electronAPI.log.write(
    batch.map((e) => ({
      ...e,
      sessionId: sessionId(),
      userId: userId ?? undefined,
    })),
  );
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
  queue.push(event);
  // Drop the oldest rather than grow without bound
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= MAX_BATCH) flush();
  else scheduleFlush();
}

/** Flush pending events before the window goes away. */
export function installLogFlushHandlers(): void {
  window.addEventListener("pagehide", flush);
}
