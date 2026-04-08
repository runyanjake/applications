import type { Application } from "../types/application";

export type SyncStatus = "synced" | "pending" | "syncing" | "error" | "conflict";

export interface SyncState {
  lastSyncedAt: number | null;
  isDirty: boolean;
  pendingChanges: number;
  status: SyncStatus;
  remoteVersion: string | null;
  error: string | null;
}

export const INITIAL_SYNC_STATE: SyncState = {
  lastSyncedAt: null,
  isDirty: false,
  pendingChanges: 0,
  status: "synced",
  remoteVersion: null,
  error: null,
};

export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function computeVersion(applications: Application[]): string {
  const sorted = [...applications].sort((a, b) => a.id.localeCompare(b.id));
  const str = JSON.stringify(
    sorted.map((a) => [
      a.id,
      a.position,
      a.companyName,
      a.companyWebsite,
      a.city,
      a.state,
      a.country,
      a.remote,
      a.salaryMin,
      a.salaryMax,
      a.currency,
      a.jobPostingUrl,
      a.interest,
      a.status,
      a.lastUpdated,
      a.notes,
      a.dateApplied,
      JSON.stringify(a.history),
    ]),
  );
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function shouldAutoSync(syncState: SyncState): boolean {
  if (!syncState.isDirty) return false;
  if (syncState.status === "syncing") return false;
  if (syncState.status === "conflict") return false;
  if (!syncState.lastSyncedAt) return true;
  return Date.now() - syncState.lastSyncedAt >= AUTO_SYNC_INTERVAL_MS;
}
