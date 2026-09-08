import type { SyncStatus } from "../../utils/sync";

/** Presentation for each sync status, shared by the indicator and the card. */
export const SYNC_STATUS_META: Record<
  SyncStatus,
  { label: string; dot: string; text: string }
> = {
  synced: { label: "Synced", dot: "bg-green-500", text: "text-green-600" },
  pending: {
    label: "Pending changes",
    dot: "bg-yellow-500",
    text: "text-yellow-600",
  },
  syncing: { label: "Syncing...", dot: "bg-blue-500", text: "text-blue-600" },
  error: { label: "Error", dot: "bg-red-500", text: "text-red-600" },
  conflict: {
    label: "Conflict",
    dot: "bg-orange-500",
    text: "text-orange-600",
  },
};
