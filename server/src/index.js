import http from "node:http";
import { mkdirSync } from "node:fs";
import { createFileLogger } from "./logger.js";
import { sanitizeBatch, sanitizeContext } from "./sanitize.js";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
// The container sets this to /app/logs; local runs write beside the repo.
const LOG_DIR = process.env.LOG_DIR ?? "./logs";
const RETENTION = process.env.LOG_RETENTION ?? "30d";
const LEVEL = process.env.LOG_LEVEL ?? "info";
// Daily by default; set to e.g. "1h" + "YYYY-MM-DD-HH" for hourly files.
const ROTATE_FREQUENCY = process.env.LOG_ROTATE_FREQUENCY ?? "1d";
const ROTATE_PATTERN = process.env.LOG_ROTATE_PATTERN ?? "YYYY-MM-DD";
// "pretty" for reading `docker logs`, "json" when a collector consumes the stream.
const CONSOLE_FORMAT = process.env.LOG_CONSOLE_FORMAT ?? "pretty";

/** Requests are tiny batches of events; anything larger is malformed or abuse. */
const MAX_BODY_BYTES = 64 * 1024;

mkdirSync(LOG_DIR, { recursive: true });
const { logger, rotate } = createFileLogger({
  logDir: LOG_DIR,
  retention: RETENTION,
  level: LEVEL,
  datePattern: ROTATE_PATTERN,
  frequency: ROTATE_FREQUENCY,
  consoleFormat: CONSOLE_FORMAT,
});

rotate.on("rotate", (oldFile, newFile) => {
  logger.info("Log file rotated", {
    scope: "log-server",
    data: { oldFile, newFile },
  });
});
rotate.on("error", (err) => {
  console.error("[log-server] transport error:", err);
});

function send(res, status, body) {
  const payload = body ? JSON.stringify(body) : "";
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

/** Collect the request body, refusing anything over the cap. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }
  return req.socket.remoteAddress ?? "unknown";
}

async function handleIngest(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    send(res, 400, { error: err.message === "payload too large" ? err.message : "invalid JSON" });
    return;
  }

  const context = sanitizeContext(body);
  const events = sanitizeBatch(body);
  const ip = clientIp(req);

  for (const event of events) {
    const { level, message, ...rest } = event;
    logger.log(level, message, { ...rest, ...context, ip });
  }

  send(res, 202, { accepted: events.length });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/healthz") {
    send(res, 200, { ok: true, logDir: LOG_DIR, retention: RETENTION });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logs") {
    handleIngest(req, res).catch((err) => {
      console.error("[log-server] ingest failed:", err);
      send(res, 500, { error: "ingest failed" });
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(
    `[log-server] listening on ${HOST}:${PORT}, writing to ${LOG_DIR} ` +
      `(rotate ${ROTATE_FREQUENCY}, keep ${RETENTION})`,
  );
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[log-server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
