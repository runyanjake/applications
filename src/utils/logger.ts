import {
  enqueueLogEvent,
  type LogLevel,
  type RemoteLogEvent,
} from "./log-transport";

/**
 * Scoped logger. Everything goes to the console; warnings, errors and audit
 * events are also shipped to the log-sink service, which writes the rotating
 * files under the mounted logs directory.
 *
 * Debug output is opt-in via `localStorage["jat:debug"] = "1"` (always on in
 * development) and is only shipped when that flag is set.
 */
const DEBUG_KEY = "jat:debug";

function debugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Console args → a single message plus any structured detail worth keeping. */
function describe(args: unknown[]): {
  message: string;
  data?: Record<string, unknown>;
} {
  const message = args.map(stringify).join(" ").slice(0, 2000);
  const error = args.find((arg): arg is Error => arg instanceof Error);
  if (!error?.stack) return { message };
  return { message, data: { stack: error.stack.slice(0, 1000) } };
}

function emit(
  scope: string,
  level: LogLevel,
  args: unknown[],
  event?: string,
  data?: Record<string, unknown>,
): void {
  const described = describe(args);
  const remote: RemoteLogEvent = {
    ts: new Date().toISOString(),
    level,
    scope,
    event,
    message: described.message,
    data: { ...described.data, ...data },
  };
  if (level !== "debug" || debugEnabled()) enqueueLogEvent(remote);
}

export interface Logger {
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  /** Records a named business event (CRUD and other significant actions). */
  audit(event: string, data?: Record<string, unknown>): void;
}

export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;
  return {
    debug: (...args) => {
      if (debugEnabled()) console.debug(prefix, ...args);
      emit(scope, "debug", args);
    },
    warn: (...args) => {
      console.warn(prefix, ...args);
      emit(scope, "warn", args);
    },
    error: (...args) => {
      console.error(prefix, ...args);
      emit(scope, "error", args);
    },
    audit: (event, data) => {
      if (debugEnabled()) console.debug(prefix, event, data ?? "");
      emit(scope, "info", [event], event, data);
    },
  };
}
