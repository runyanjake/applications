import { useApplications } from "../../hooks/use-applications";
import { useAuth } from "../../hooks/use-auth";
import { formatRelativeDate } from "../../utils/formatters";

export function SyncIndicator() {
  const { state: authState } = useAuth();
  const appCtx = useApplications();

  if (!authState.isAuthenticated) return null;

  const { syncState, sync, forceOverwrite, reloadFromRemote } = appCtx;

  if (syncState.status === "conflict") {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-orange-500" />
        <span className="text-xs text-orange-600">Conflict</span>
        <button
          onClick={forceOverwrite}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Push local
        </button>
        <button
          onClick={reloadFromRemote}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Pull remote
        </button>
      </div>
    );
  }

  if (syncState.status === "error") {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-600" title={syncState.error ?? ""}>
          Sync error
        </span>
        <button
          onClick={sync}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (syncState.status === "syncing") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        <span className="text-xs text-gray-500">Syncing...</span>
      </div>
    );
  }

  if (syncState.status === "pending") {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="text-xs text-gray-500">
          {syncState.pendingChanges} unsaved
        </span>
        <button
          onClick={sync}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Sync now
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      <span className="text-xs text-gray-400">
        {syncState.lastSyncedAt
          ? `Synced ${formatRelativeDate(new Date(syncState.lastSyncedAt).toISOString())}`
          : "Synced"}
      </span>
    </div>
  );
}
