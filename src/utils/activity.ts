import type { Application, HistoryEntry } from "../types/application";
import { isWithinBounds, type DateBounds } from "./date-range";

/** One status change, with the application it belongs to. */
export interface ActivityEvent {
  app: Application;
  change: HistoryEntry;
}

/** Status history; a legacy record without one counts as a single creation event. */
export function historyOf(app: Application): HistoryEntry[] {
  // `history` is absent on records restored from an older session payload
  return app.history?.length
    ? app.history
    : [{ ts: app.lastUpdated, from: null, to: app.status }];
}

/** Every status change inside the bounds, newest first. Unparseable timestamps are dropped. */
export function collectActivity(
  applications: Application[],
  bounds: DateBounds,
): ActivityEvent[] {
  return applications
    .flatMap((app) => historyOf(app).map((change) => ({ app, change })))
    .filter(
      ({ change }) =>
        change.ts && !Number.isNaN(Date.parse(change.ts)) && isWithinBounds(change.ts, bounds),
    )
    .sort((a, b) => Date.parse(b.change.ts) - Date.parse(a.change.ts));
}
