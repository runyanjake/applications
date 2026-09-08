import { useMemo, useState } from "react";
import { useApplications } from "../hooks/use-applications";
import type { Application } from "../types/application";
import { ACTIVE_STATUSES, COMPLETE_STATUSES } from "../types/application";
import { STATUS_HEX } from "../config/theme";
import { formatStatus } from "../utils/formatters";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { SegmentedControl } from "../components/ui/segmented-control";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";

type TimeRange = "week" | "month" | "year" | "all";

const RANGE_OPTIONS = [
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "year", label: "Last Year" },
  { value: "all", label: "All Time" },
] as const satisfies readonly { value: TimeRange; label: string }[];

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_DAYS: Record<Exclude<TimeRange, "all">, number> = {
  week: 7,
  month: 30,
  year: 365,
};

function rangeLabel(range: TimeRange): string {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label ?? "";
}

function rangeStart(range: TimeRange): number | null {
  return range === "all" ? null : Date.now() - RANGE_DAYS[range] * DAY_MS;
}

function inRange(dateStr: string, start: number | null): boolean {
  if (!start) return true;
  return new Date(dateStr).getTime() >= start;
}

function computeStats(applications: Application[], range: TimeRange) {
  const start = rangeStart(range);
  return {
    active: applications.filter((app) => ACTIVE_STATUSES.includes(app.status)),
    sent: applications.filter(
      (app) =>
        app.status !== "bookmarked" &&
        app.dateApplied &&
        inRange(app.dateApplied, start),
    ),
    transitioned: applications.filter(
      (app) =>
        app.lastUpdated &&
        inRange(app.lastUpdated, start) &&
        (ACTIVE_STATUSES.includes(app.status) ||
          COMPLETE_STATUSES.includes(app.status)),
    ),
  };
}

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <Card className="p-5 text-center">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-5xl font-bold text-indigo-600">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{caption}</p>
    </Card>
  );
}

export function ReportPage() {
  const { applications } = useApplications();
  const [range, setRange] = useState<TimeRange>("week");

  const stats = useMemo(
    () => computeStats(applications, range),
    [applications, range],
  );

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <RequireSpreadsheet>
      <div className="space-y-4">
        {/* Controls — hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>

        <div className="space-y-6 rounded-xl bg-gray-50 p-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              PWS Applications — Status Report
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {rangeLabel(range)} · Generated {today}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Active in Pipeline"
              value={stats.active.length}
              caption="currently interviewing"
            />
            <StatCard
              label="Applications Sent"
              value={stats.sent.length}
              caption={rangeLabel(range).toLowerCase()}
            />
            <StatCard
              label="Status Changes"
              value={stats.transitioned.length}
              caption="moved to active or complete"
            />
          </div>

          <Card className="p-4">
            <ApplicationPipelineSankey
              applications={applications}
              title="Application Pipeline"
            />
          </Card>

          {stats.transitioned.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Status Changes — {rangeLabel(range)}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Position</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.transitioned.map((app) => (
                    <tr key={app.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {app.companyName}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{app.position}</td>
                      <td className="py-2 pr-4">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: STATUS_HEX[app.status] }}
                        >
                          {formatStatus(app.status)}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(app.lastUpdated).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </RequireSpreadsheet>
  );
}
