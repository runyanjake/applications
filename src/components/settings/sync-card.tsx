import { useApplications } from "../../hooks/use-applications";
import { formatRelativeDate } from "../../utils/formatters";

export function SyncCard() {
  const { syncState, sync, forceOverwrite, reloadFromRemote } =
    useApplications();

  const isBusy = syncState.status === "syncing";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Data Sync
      </h2>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Status</span>
          <StatusLabel status={syncState.status} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Last synced</span>
          <span className="text-gray-900">
            {syncState.lastSyncedAt
              ? formatRelativeDate(
                  new Date(syncState.lastSyncedAt).toISOString(),
                )
              : "Never"}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Pending changes</span>
          <span className="text-gray-900">{syncState.pendingChanges}</span>
        </div>
      </div>

      {syncState.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {syncState.error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {syncState.status === "conflict" ? (
          <>
            <button
              onClick={forceOverwrite}
              disabled={isBusy}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Push local to remote
            </button>
            <button
              onClick={reloadFromRemote}
              disabled={isBusy}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Pull remote (discard local)
            </button>
          </>
        ) : (
          <>
            <button
              onClick={sync}
              disabled={isBusy || !syncState.isDirty}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isBusy ? "Syncing..." : "Sync now"}
            </button>
            <button
              onClick={reloadFromRemote}
              disabled={isBusy}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reload from remote
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const styles: Record<string, string> = {
    synced: "text-green-600",
    pending: "text-yellow-600",
    syncing: "text-blue-600",
    error: "text-red-600",
    conflict: "text-orange-600",
  };
  const labels: Record<string, string> = {
    synced: "Synced",
    pending: "Pending changes",
    syncing: "Syncing...",
    error: "Error",
    conflict: "Conflict",
  };
  return (
    <span className={`font-medium ${styles[status] ?? "text-gray-900"}`}>
      {labels[status] ?? status}
    </span>
  );
}
