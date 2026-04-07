import { useMemo, useState } from "react";
import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import { LoadingSpinner } from "../components/shared/loading-spinner";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";
import type { Application, ApplicationStatus } from "../types/application";
import { ACTIVE_STATUSES, COMPLETE_STATUSES } from "../types/application";

type TimeRange = "week" | "month" | "year" | "all";

const RANGE_LABELS: Record<TimeRange, string> = {
  week: "Last 7 Days",
  month: "Last 30 Days",
  year: "Last Year",
  all: "All Time",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  bookmarked: "#9ca3af",
  applied: "#818cf8",
  interviewing: "#fbbf24",
  offered: "#34d399",
  rejected: "#f87171",
  withdrawn: "#fb923c",
  ghosted: "#a78bfa",
};

function getRangeStart(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // year
  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
}

function inRange(dateStr: string, start: Date | null): boolean {
  if (!start) return true;
  const d = new Date(dateStr);
  return d >= start;
}

function computeStats(applications: Application[], range: TimeRange) {
  const start = getRangeStart(range);

  const activeApplications = applications.filter((a) =>
    ACTIVE_STATUSES.includes(a.status),
  );

  const newApplicationsSent = applications.filter(
    (a) => a.status !== "bookmarked" && a.dateApplied && inRange(a.dateApplied, start),
  );

  const transitioned = applications.filter(
    (a) =>
      a.lastUpdated &&
      inRange(a.lastUpdated, start) &&
      (ACTIVE_STATUSES.includes(a.status) || COMPLETE_STATUSES.includes(a.status)),
  );

  return { activeApplications, newApplicationsSent, transitioned };
}

export function ReportPage() {
  const { isConfigured } = useStorage();
  const { applications, isLoading } = useApplications();
  const [range, setRange] = useState<TimeRange>("week");


  const stats = useMemo(
    () => computeStats(applications, range),
    [applications, range],
  );

  function handleDownload() {
    window.print();
  }

  if (!isConfigured) return <SpreadsheetSetup />;
  if (isLoading) return <LoadingSpinner className="py-32" />;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Controls — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Download PDF
        </button>
      </div>

      <div className="space-y-6 rounded-xl bg-gray-50 p-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">PWS Applications — Status Report</h1>
          <p className="mt-1 text-sm text-gray-500">
            {RANGE_LABELS[range]} · Generated {today}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Active in Pipeline</p>
            <p className="mt-2 text-5xl font-bold text-indigo-600">
              {stats.activeApplications.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">currently interviewing</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Applications Sent</p>
            <p className="mt-2 text-5xl font-bold text-indigo-600">
              {stats.newApplicationsSent.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">{RANGE_LABELS[range].toLowerCase()}</p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 text-center">
            <p className="text-sm font-medium text-gray-500">Status Changes</p>
            <p className="mt-2 text-5xl font-bold text-indigo-600">
              {stats.transitioned.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">moved to active or complete</p>
          </div>
        </div>

        {/* Sankey */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <ApplicationPipelineSankey
            applications={applications}
            title="Application Pipeline"
          />
        </div>

        {/* Transitioned applications list */}
        {stats.transitioned.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Status Changes — {RANGE_LABELS[range]}
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
                    <td className="py-2 pr-4 font-medium text-gray-900">{app.companyName}</td>
                    <td className="py-2 pr-4 text-gray-600">{app.position}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[app.status] }}
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">
                      {new Date(app.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
