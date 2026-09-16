import type { Application, ApplicationStatus } from "../types/application";
import type { CategoryPoint } from "../types/chart";
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
