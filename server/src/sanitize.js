/** Hard caps so one client cannot write unbounded data into the log files. */
export const LIMITS = {
  events: 50,
  scope: 64,
  event: 96,
  message: 2000,
  dataChars: 4000,
  stringValue: 512,
};

const LEVELS = new Set(["debug", "info", "warn", "error"]);

/**
 * Credentials should never reach disk. Google API keys, bearer tokens and
 * `key=` query parameters can all appear inside upstream error strings.
 */
const REDACTIONS = [
  [/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]"],
  [/\bya29\.[0-9A-Za-z._-]+/g, "[redacted-access-token]"],
  [/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[redacted]"],
  [/([?&](?:key|access_token|api_key)=)[^&\s"']+/gi, "$1[redacted]"],
];

export function redact(value) {
  let out = value;
  for (const [pattern, replacement] of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function cleanString(value, max) {
  if (typeof value !== "string") return undefined;
  const trimmed = redact(value).slice(0, max);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Shallow-copy the payload, keeping only JSON-ish scalars and short strings. */
function cleanData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;

  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (Object.keys(out).length >= 24) break;
    const safeKey = key.slice(0, 48);
    if (value == null) continue;
    if (typeof value === "string") {
      const clean = cleanString(value, LIMITS.stringValue);
      if (clean !== undefined) out[safeKey] = clean;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[safeKey] = value;
    } else {
      const clean = cleanString(JSON.stringify(value), LIMITS.stringValue);
      if (clean !== undefined) out[safeKey] = clean;
    }
  }

  if (Object.keys(out).length === 0) return undefined;
  // Guard against many medium-sized fields adding up
  if (JSON.stringify(out).length > LIMITS.dataChars) {
    return { truncated: true };
  }
  return out;
}

function cleanTimestamp(value) {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  // Ignore clocks that are wildly out; the server timestamp still applies
  const skew = Math.abs(ms - Date.now());
  return skew > 7 * 24 * 60 * 60 * 1000 ? undefined : new Date(ms).toISOString();
}

/**
 * Normalize one client-submitted event. Returns null when there is nothing
 * worth writing.
 */
export function sanitizeEvent(raw) {
  if (!raw || typeof raw !== "object") return null;

  const message = cleanString(raw.message, LIMITS.message);
  const event = cleanString(raw.event, LIMITS.event);
  if (!message && !event) return null;

  return {
    level: LEVELS.has(raw.level) ? raw.level : "info",
    scope: cleanString(raw.scope, LIMITS.scope) ?? "client",
    event,
    message: message ?? event,
    clientTime: cleanTimestamp(raw.ts),
    data: cleanData(raw.data),
  };
}

export function sanitizeBatch(body) {
  const events = Array.isArray(body?.events) ? body.events : [];
  return events
    .slice(0, LIMITS.events)
    .map(sanitizeEvent)
    .filter((event) => event !== null);
}

/** Per-tab session id and Google user id, both opaque. */
export function sanitizeContext(body) {
  return {
    sessionId: cleanString(body?.sessionId, 64),
    userId: cleanString(body?.userId, 64),
    appVersion: cleanString(body?.appVersion, 32),
  };
}
