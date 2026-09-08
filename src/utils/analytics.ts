import type { Application, ApplicationStatus } from "../types/application";
import type { CategoryPoint, StatusTimelinePoint } from "../types/chart";
import { STATUS_HEX, paletteColor } from "../config/theme";
import { formatStatus } from "./formatters";

const ZERO_COUNTS: Record<ApplicationStatus, number> = {
  bookmarked: 0, applied: 0, interviewing: 0,
  offered: 0, rejected: 0, withdrawn: 0, ghosted: 0,
};

export function countByStatus(
  applications: Application[],
): Record<ApplicationStatus, number> {
  const counts = { ...ZERO_COUNTS };
  for (const app of applications) counts[app.status]++;
  return counts;
}

/** Applications per status, dropping statuses nobody is in. */
export function buildStatusBreakdown(
  applications: Application[],
): CategoryPoint[] {
  const counts = countByStatus(applications);
  return (Object.keys(counts) as ApplicationStatus[])
    .filter((status) => counts[status] > 0)
    .map((status) => ({
      label: formatStatus(status),
      value: counts[status],
      color: STATUS_HEX[status],
    }));
}

/** Top companies by application count, with the tail folded into "Other". */
export function buildCompanyBreakdown(
  applications: Application[],
  topN = 9,
): CategoryPoint[] {
  const counts = new Map<string, number>();
  for (const app of applications) {
    const name = app.companyName || "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const otherCount = sorted
    .slice(topN)
    .reduce((sum, [, count]) => sum + count, 0);
  const entries: [string, number][] =
    otherCount > 0 ? [...top, ["Other", otherCount]] : top;

  return entries.map(([label, value], index) => ({
    label,
    value,
    color: paletteColor(index),
  }));
}

type StatusEvent = {
  ts: string;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
};

/**
 * Running status counts, emitting one point per instant at which something
 * actually changed (not on a fixed interval). O(n log n) via sort + streaming
 * delta over every application's history.
 */
export function buildStatusTimeline(
  applications: Application[],
): StatusTimelinePoint[] {
  const events: StatusEvent[] = [];
  for (const app of applications) {
    if (app.history.length > 0) {
      events.push(...app.history);
    } else {
      // Legacy application with no history: treat it as a single creation event
      events.push({ ts: app.lastUpdated, from: null, to: app.status });
    }
  }
  if (events.length === 0) return [];

  events.sort((a, b) => a.ts.localeCompare(b.ts));

  const counts = { ...ZERO_COUNTS };
  const points: StatusTimelinePoint[] = [];

  for (let i = 0; i < events.length; ) {
    const ts = events[i]!.ts;
    // Collapse every event sharing this timestamp into one point
    while (i < events.length && events[i]!.ts === ts) {
      const { from, to } = events[i]!;
      if (from !== null) counts[from]--;
      counts[to]++;
      i++;
    }
    points.push({ ts, ...counts });
  }

  // Extend the line to now without implying a change happened
  const nowTs = new Date().toISOString();
  if (points[points.length - 1]!.ts < nowTs) {
    points.push({ ts: nowTs, ...counts });
  }

  return points;
}
