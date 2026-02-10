import { useMemo } from "react";
import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import type { Application, ApplicationStatus } from "../types/application";
import { PageHeader } from "../components/shared/page-header";
import { EmptyState } from "../components/shared/empty-state";
import { LoadingSpinner } from "../components/shared/loading-spinner";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";
import { StatusDistributionChart } from "../components/charts/status-distribution-chart";
import { ApplicationsTimelineChart } from "../components/charts/applications-timeline-chart";
import { SalaryRangeChart } from "../components/charts/salary-range-chart";
import { TopCompaniesChart } from "../components/charts/top-companies-chart";
import { RemoteDistributionChart } from "../components/charts/remote-distribution-chart";
import { InterestDistributionChart } from "../components/charts/interest-distribution-chart";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  bookmarked: "#9ca3af",
  applying: "#60a5fa",
  applied: "#818cf8",
  interviewing: "#fbbf24",
  offered: "#34d399",
  accepted: "#10b981",
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

function buildTimelineData(apps: Application[]) {
  const counts = new Map<string, number>();
  for (const app of apps) {
    const date = app.dateApplied?.slice(0, 7);
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

function buildSalaryData(apps: Application[]) {
  return apps
    .filter((a) => a.salaryMin != null || a.salaryMax != null)
    .slice(0, 15)
    .map((a) => ({
      label: `${a.companyName} - ${a.position}`.slice(0, 30),
      min: a.salaryMin ?? 0,
      max: a.salaryMax ?? 0,
    }));
}

function buildCompanyData(apps: Application[]) {
  const counts = new Map<string, number>();
  for (const app of apps) {
    counts.set(app.companyName, (counts.get(app.companyName) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, value]) => ({ label, value }));
}

function buildRemoteData(apps: Application[]) {
  const remote = apps.filter((a) => a.remote).length;
  const onsite = apps.length - remote;
  return [
    { label: "Remote", value: remote, color: "#34d399" },
    { label: "On-site", value: onsite, color: "#60a5fa" },
  ];
}

function buildInterestData(apps: Application[]) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const app of apps) {
    counts[app.interest]++;
  }
  return [
    { label: "High", value: counts.high, color: "#10b981" },
    { label: "Medium", value: counts.medium, color: "#fbbf24" },
    { label: "Low", value: counts.low, color: "#f87171" },
  ];
}

export function AnalyticsPage() {
  const { isConfigured } = useStorage();
  const { applications, isLoading } = useApplications();

  const charts = useMemo(() => {
    if (applications.length === 0) return null;
    return {
      status: buildStatusData(applications),
      timeline: buildTimelineData(applications),
      salary: buildSalaryData(applications),
      companies: buildCompanyData(applications),
      remote: buildRemoteData(applications),
      interest: buildInterestData(applications),
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <StatusDistributionChart
            data={charts.status}
            title="Status Distribution"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <RemoteDistributionChart
            data={charts.remote}
            title="Remote vs On-site"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <ApplicationsTimelineChart
            data={charts.timeline}
            title="Applications Over Time"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <TopCompaniesChart
            data={charts.companies}
            title="Top Companies"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <InterestDistributionChart
            data={charts.interest}
            title="Interest Level"
          />
        </div>

        {charts.salary.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
            <SalaryRangeChart
              data={charts.salary}
              title="Salary Ranges"
              height={Math.max(300, charts.salary.length * 40)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
