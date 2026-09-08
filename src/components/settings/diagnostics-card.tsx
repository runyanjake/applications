import { useState } from "react";
import { useAuth } from "../../hooks/use-auth";
import { useStorage } from "../../hooks/use-storage";
import { ENV } from "../../config/env";
import { getLogTransportStatus } from "../../utils/log-transport";
import { GOOGLE_SCOPES } from "../../config/google";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/** Mask a credential so it can be read aloud without disclosing it. */
function mask(value: string | undefined): string {
  if (!value) return "missing";
  return value.length <= 12
    ? "set"
    : `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} chars)`;
}

function collectChecks(
  hasToken: boolean,
  expiresAt: number | null,
  spreadsheetId: string | null,
): Check[] {
  const gapi = window.gapi;
  const logs = getLogTransportStatus();
  return [
    {
      label: "API key configured",
      ok: Boolean(ENV.googleApiKey),
      detail: mask(ENV.googleApiKey),
    },
    {
      label: "OAuth client ID configured",
      ok: Boolean(ENV.googleClientId),
      detail: mask(ENV.googleClientId),
    },
    {
      label: "gapi client loaded",
      ok: Boolean(gapi?.client),
      detail: gapi?.client ? "ready" : "not loaded",
    },
    {
      label: "Sheets API discovery loaded",
      ok: Boolean(gapi?.client?.sheets),
      detail: gapi?.client?.sheets
        ? "ready"
        : "missing — check that the Google Sheets API is enabled",
    },
    {
      label: "Picker module loaded",
      ok: Boolean(window.google?.picker),
      detail: window.google?.picker
        ? "ready"
        : "missing — check that the Google Picker API is enabled",
    },
    {
      label: "Access token installed on gapi",
      ok: Boolean(gapi?.client?.getToken?.()),
      detail: gapi?.client?.getToken?.() ? "present" : "absent",
    },
    {
      label: "Session token",
      ok: hasToken,
      detail: expiresAt
        ? `expires ${new Date(expiresAt).toLocaleTimeString()}`
        : "none",
    },
    {
      label: "Spreadsheet connected",
      ok: Boolean(spreadsheetId),
      detail: spreadsheetId ?? "none",
    },
    {
      label: "Log shipping",
      ok: logs.enabled,
      detail: logs.enabled
        ? `session ${logs.sessionId.slice(0, 8)}, ${logs.queued} queued`
        : `disabled after ${logs.failures} failed posts`,
    },
  ];
}

/**
 * Read-only view of the Google integration's state. When data will not load,
 * this is the fastest way to tell a credential problem from an API-enablement
 * problem from an expired session.
 */
export function DiagnosticsCard() {
  const { state } = useAuth();
  const { spreadsheet } = useStorage();
  const [checks, setChecks] = useState<Check[] | null>(null);

  const run = () =>
    setChecks(
      collectChecks(
        Boolean(state.tokens),
        state.tokens?.expiresAt ?? null,
        spreadsheet?.id ?? null,
      ),
    );

  return (
    <TitledCard
      title="Diagnostics"
      description="Check the Google integration when applications will not load."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={run}>
          Run checks
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            localStorage.setItem("jat:debug", "1");
            run();
          }}
        >
          Enable verbose logging
        </Button>
      </div>

      {checks && (
        <>
          <ul className="mt-4 space-y-1 text-sm">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2">
                <span className={check.ok ? "text-green-600" : "text-red-600"}>
                  {check.ok ? "✓" : "✗"}
                </span>
                <span className="text-gray-700">{check.label}</span>
                <span className="ml-auto truncate text-xs text-gray-400">
                  {check.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Scopes requested: {GOOGLE_SCOPES}
          </p>
        </>
      )}
    </TitledCard>
  );
}
