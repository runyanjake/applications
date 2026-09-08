import { useApplications } from "../../hooks/use-applications";
import { formatRelativeDate } from "../../utils/formatters";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";
import { SYNC_STATUS_META } from "./sync-status-meta";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  );
}

export function SyncCard() {
  const { syncState, sync, forceOverwrite, reloadFromRemote } =
    useApplications();

  const isBusy = syncState.status === "syncing";
  const meta = SYNC_STATUS_META[syncState.status];

  return (
    <TitledCard title="Data Sync">
      <div className="mb-4 space-y-2">
        <Row label="Status">
          <span className={`font-medium ${meta.text}`}>{meta.label}</span>
        </Row>
        <Row label="Last synced">
          <span className="text-gray-900">
            {syncState.lastSyncedAt
              ? formatRelativeDate(new Date(syncState.lastSyncedAt).toISOString())
              : "Never"}
          </span>
        </Row>
        <Row label="Pending changes">
          <span className="text-gray-900">{syncState.pendingChanges}</span>
        </Row>
      </div>

      {syncState.error && (
        <Alert tone="error" className="mb-4">
          {syncState.error}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {syncState.status === "conflict" ? (
          <>
            <Button onClick={forceOverwrite} disabled={isBusy}>
              Push local to remote
            </Button>
            <Button
              variant="secondary"
              onClick={reloadFromRemote}
              disabled={isBusy}
            >
              Pull remote (discard local)
            </Button>
          </>
        ) : (
          <>
            <Button onClick={sync} disabled={isBusy || !syncState.isDirty}>
              {isBusy ? "Syncing..." : "Sync now"}
            </Button>
            <Button
              variant="secondary"
              onClick={reloadFromRemote}
              disabled={isBusy}
            >
              Reload from remote
            </Button>
          </>
        )}
      </div>
    </TitledCard>
  );
}
