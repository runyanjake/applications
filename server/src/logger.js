import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Winston logger writing newline-delimited JSON to a date-stamped file.
 * Rotation is purely time based (one file per day); `maxFiles` is expressed in
 * days so retention is time based too.
 */
export function createFileLogger({
  logDir,
  retention,
  level,
  datePattern = "YYYY-MM-DD",
  frequency = "1d",
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
  });

  const logger = createLogger({
    level,
    format: format.combine(format.timestamp(), format.json()),
    transports: [rotate],
    // Never let a logging failure take the process down
    exitOnError: false,
  });

  // Mirror to stdout so `docker logs` still shows what is happening
  logger.add(
    new transports.Console({
      format: format.combine(format.timestamp(), format.simple()),
    }),
  );

  return { logger, rotate };
}
