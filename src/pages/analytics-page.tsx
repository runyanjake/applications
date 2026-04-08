import { useMemo } from "react";
import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import type { Application, ApplicationStatus } from "../types/application";
import { ACTIVE_STATUSES } from "../types/application";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { LoadingSpinner } from "../components/shared/loading-spinner";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";
import { StatusDistributionChart } from "../components/charts/status-distribution-chart";
import { ApplicationsTimelineChart, type StatusTimelinePoint } from "../components/charts/applications-timeline-chart";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";

const COMPANY_PALETTE = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#94a3b8",
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  bookmarked: "#9ca3af",
  applied: "#818cf8",
  interviewing: "#fbbf24",
  offered: "#34d399",
  rejected: "#f87171",
  withdrawn: "#fb923c",
  ghosted: "#a78bfa",
};

function buildStatusData(apps: Application[]) {
  const counts = new Map<ApplicationStatus, number>();
  for (const app of apps) {
    counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, value]) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value,
    color: STATUS_COLORS[status],
  }));
}

function buildCompanyData(apps: Application[]) {
  const counts = new Map<string, number>();
  for (const app of apps) {
    const name = app.companyName || "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  // Top 9 companies + "Other" bucket
  const top = sorted.slice(0, 9);
  const otherCount = sorted.slice(9).reduce((sum, [, n]) => sum + n, 0);
  const entries = otherCount > 0 ? [...top, ["Other", otherCount] as [string, number]] : top;
  return entries.map(([name, value], i) => ({
    label: name,
    value,
    color: COMPANY_PALETTE[i % COMPANY_PALETTE.length] ?? "#94a3b8",
  }));
}

function buildTimelineData(apps: Application[]): StatusTimelinePoint[] {
  // Flatten all history entries into a single event list
  const events: { ts: string; from: ApplicationStatus | null; to: ApplicationStatus }[] = [];

  for (const app of apps) {
    if (app.history.length > 0) {
      for (const entry of app.history) {
        events.push({ ts: entry.ts, from: entry.from, to: entry.to });
      }
    } else {
      // Legacy app: synthetic creation event at lastUpdated
      events.push({ ts: app.lastUpdated, from: null, to: app.status });
    }
  }

  if (events.length === 0) return [];

  events.sort((a, b) => a.ts.localeCompare(b.ts));

  // Walk events in order, applying each delta to running counts.
  // Emit one data point per unique timestamp (batch same-ts events together).
  const counts: Record<ApplicationStatus, number> = {
    bookmarked: 0, applied: 0, interviewing: 0,
    offered: 0, rejected: 0, withdrawn: 0, ghosted: 0,
  };
  const points: StatusTimelinePoint[] = [];
  let i = 0;

  while (i < events.length) {
    const ts = events[i].ts;
    // Apply all events sharing this timestamp
    while (i < events.length && events[i].ts === ts) {
      const { from, to } = events[i];
      if (from !== null) counts[from]--;
      counts[to]++;
      i++;
    }
    points.push({ ts, ...counts });
  }

  // Trailing point at "now" so the final state extends to the present
  points.push({ ts: new Date().toISOString(), ...counts });

  return points;
}

export function AnalyticsPage() {
  const { isConfigured } = useStorage();
  const { applications, isLoading } = useApplications();

  const charts = useMemo(() => {
    if (applications.length === 0) return null;
    return {
      status: buildStatusData(applications),
      company: buildCompanyData(applications),
      timeline: buildTimelineData(applications),
      activeCount: applications.filter((a) =>
        ACTIVE_STATUSES.includes(a.status),
      ).length,
    };
  }, [applications]);

  if (!isConfigured) return <SpreadsheetSetup />;
  if (isLoading) return <LoadingSpinner className="py-32" />;

  if (!charts) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <EmptyState
          title="No data to analyze"
          description="Add some applications to see your analytics."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Insights from ${applications.length} applications`}
      />

      <div className="space-y-6">
        {/* Row 1: status pie + active count + company pie */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <StatusDistributionChart
              data={charts.status}
              title="Status Distribution"
              height={200}
            />
          </div>

          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Active In Pipeline</p>
              <p className="mt-1 text-5xl font-bold text-indigo-600">
                {charts.activeCount}
              </p>
              <p className="mt-1 text-xs text-gray-400">interviewing</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <StatusDistributionChart
              data={charts.company}
              title="By Company"
              height={200}
            />
          </div>
        </div>

        {/* Row 2: Sankey pipeline */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <ApplicationPipelineSankey
            applications={applications}
            title="Application Pipeline"
          />
        </div>

        {/* Row 3: Timeline */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <ApplicationsTimelineChart
            data={charts.timeline}
            title="Status Over Time"
          />
        </div>
      </div>
    </div>
  );
}
