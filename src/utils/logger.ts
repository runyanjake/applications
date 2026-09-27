import {
  enqueueLogEvent,
  type LogLevel,
  type RemoteLogEvent,
} from "./log-transport";

/** Scoped logger: console plus the main process's log files. Debug in dev, info in builds. */
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const threshold = LEVEL_RANK[import.meta.env.DEV ? "debug" : "info"];

function enabled(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= threshold;
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
  if (enabled(level)) enqueueLogEvent(remote);
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  /** Records a named business event (CRUD and other significant actions). */
  audit(event: string, data?: Record<string, unknown>): void;
}

export function createLogger(scope: string): Logger {
  const prefix = `[${scope}]`;
  return {
    debug: (...args) => {
      if (enabled("debug")) console.debug(prefix, ...args);
      emit(scope, "debug", args);
    },
    info: (...args) => {
      if (enabled("info")) console.info(prefix, ...args);
      emit(scope, "info", args);
    },
    warn: (...args) => {
      if (enabled("warn")) console.warn(prefix, ...args);
      emit(scope, "warn", args);
    },
    error: (...args) => {
      if (enabled("error")) console.error(prefix, ...args);
      emit(scope, "error", args);
    },
    audit: (event, data) => {
      if (enabled("debug")) console.debug(prefix, event, data ?? "");
      emit(scope, "info", [event], event, data);
    },
  };
}
