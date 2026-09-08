import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/** Fields printed as their own column rather than in the trailing blob. */
const CONSOLE_COLUMNS = new Set(["timestamp", "level", "message", "scope", "event"]);

/**
 * One compact line per event, e.g.
 *   02:00:54.505 INFO  [applications] application.created id=a1 company=Acme
 * The full structured record still goes to the file transport.
 */
const consoleLine = format.printf((info) => {
  const time = String(info.timestamp ?? "").slice(11, 23) || "-";
  const level = info.level.toUpperCase().padEnd(5);
  const scope = info.scope ? `[${info.scope}] ` : "";
  const event = info.event && info.event !== info.message ? `${info.event} ` : "";

  const rest = Object.fromEntries(
    Object.entries(info).filter(([key]) => !CONSOLE_COLUMNS.has(key)),
  );
  let detail = "";
  try {
    if (Object.keys(rest).length > 0) detail = ` ${JSON.stringify(rest)}`;
  } catch {
    detail = " [unserializable]";
  }

  return `${time} ${level} ${scope}${event}${info.message}${detail}`;
});

/**
 * Winston logger fanning every event out to two transports:
 *   - a date-stamped file under `logDir` (the mounted volume)
 *   - stdout/stderr, so `docker logs` shows the same stream live
 *
 * Rotation is purely time based (one file per period); `maxFiles` is expressed
 * in days so retention is time based too.
 */
export function createFileLogger({
  logDir,
  retention,
  level,
  datePattern = "YYYY-MM-DD",
  frequency = "1d",
  consoleFormat = "pretty",
}) {
  const rotate = new DailyRotateFile({
    dirname: logDir,
    filename: "applications-%DATE%.log",
    datePattern,
    frequency,
    // Time based, not size based: "30d" keeps 30 days of files.
    maxFiles: retention,
    zippedArchive: false,
    utc: true,
    // A file problem (full disk, unwritable mount) must not stop console output
    handleExceptions: false,
  });

  const console_ = new transports.Console({
    // "json" suits log aggregators reading the docker stream; "pretty" is for humans
    format:
      consoleFormat === "json"
        ? format.combine(format.timestamp(), format.json())
        : format.combine(format.timestamp(), consoleLine),
    // Errors belong on stderr, which is what docker/most collectors expect
    stderrLevels: ["error"],
  });

  const logger = createLogger({
    level,
    format: format.combine(format.timestamp(), format.json()),
    transports: [rotate, console_],
    // Never let a logging failure take the process down
    exitOnError: false,
  });

  return { logger, rotate };
}
