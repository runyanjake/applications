import type { ReactNode } from "react";
import { useApplications } from "../../hooks/use-applications";
import { useAuth } from "../../hooks/use-auth";
import { formatRelativeDate } from "../../utils/formatters";
import { LinkButton } from "../ui/button";
import { SYNC_STATUS_META } from "./sync-status-meta";

function Indicator({
  dot,
  children,
}: {
  dot: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot}
      {children}
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

/** Compact sync status for the navbar, with the relevant recovery action. */
export function SyncIndicator() {
  const { state: authState } = useAuth();
  const { syncState, sync, forceOverwrite, reloadFromRemote } =
    useApplications();

  if (!authState.isAuthenticated) return null;

  const meta = SYNC_STATUS_META[syncState.status];

  switch (syncState.status) {
    case "conflict":
      return (
        <Indicator dot={<Dot className={meta.dot} />}>
          <span className={`text-xs ${meta.text}`}>{meta.label}</span>
          <LinkButton
            onClick={forceOverwrite}
            className="text-xs text-indigo-600"
          >
            Push local
          </LinkButton>
          <LinkButton
            onClick={reloadFromRemote}
            className="text-xs text-red-600"
          >
            Pull remote
          </LinkButton>
        </Indicator>
      );

    case "error":
      return (
        <Indicator dot={<Dot className={meta.dot} />}>
          <span
            className={`text-xs ${meta.text}`}
            title={syncState.error ?? ""}
          >
            Sync error
          </span>
          <LinkButton onClick={sync} className="text-xs text-indigo-600">
            Retry
          </LinkButton>
        </Indicator>
      );

    case "syncing":
      return (
        <Indicator
          dot={
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          }
        >
          <span className="text-xs text-gray-500">Syncing...</span>
        </Indicator>
      );

    case "pending":
      return (
        <Indicator dot={<Dot className={meta.dot} />}>
          <span className="text-xs text-gray-500">
            {syncState.pendingChanges} unsaved
          </span>
          <LinkButton onClick={sync} className="text-xs text-indigo-600">
            Sync now
          </LinkButton>
        </Indicator>
      );

    default:
      return (
        <Indicator dot={<Dot className={meta.dot} />}>
          <span className="text-xs text-gray-400">
            {syncState.lastSyncedAt
              ? `Synced ${formatRelativeDate(new Date(syncState.lastSyncedAt).toISOString())}`
              : "Synced"}
          </span>
        </Indicator>
      );
  }
}
