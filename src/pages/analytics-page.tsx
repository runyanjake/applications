import { useMemo } from "react";
import { useApplications } from "../hooks/use-applications";
import { ACTIVE_STATUSES } from "../types/application";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState } from "../components/ui/empty-state";
import { Card } from "../components/ui/card";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { DonutChart } from "../components/charts/donut-chart";
import { StatusTimelineChart } from "../components/charts/status-timeline-chart";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";
import {
  buildCompanyBreakdown,
  buildStatusBreakdown,
  buildStatusTimeline,
} from "../utils/analytics";

export function AnalyticsPage() {
  const { applications } = useApplications();

  const charts = useMemo(() => {
    if (applications.length === 0) return null;
    return {
      status: buildStatusBreakdown(applications),
      company: buildCompanyBreakdown(applications),
      timeline: buildStatusTimeline(applications),
      activeCount: applications.filter((app) =>
        ACTIVE_STATUSES.includes(app.status),
      ).length,
    };
  }, [applications]);

  return (
    <RequireSpreadsheet>
      <PageHeader
        title="Analytics"
        description={
          charts ? `Insights from ${applications.length} applications` : undefined
        }
      />

      {!charts ? (
        <EmptyState
          title="No data to analyze"
          description="Add some applications to see your analytics."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="p-4">
              <DonutChart
                data={charts.status}
                title="Status Distribution"
                height={200}
              />
            </Card>

            <Card className="flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">
                  Active In Pipeline
                </p>
                <p className="mt-1 text-5xl font-bold text-indigo-600">
                  {charts.activeCount}
                </p>
                <p className="mt-1 text-xs text-gray-400">interviewing</p>
              </div>
            </Card>

            <Card className="p-4">
              <DonutChart
                data={charts.company}
                title="By Company"
                height={200}
              />
            </Card>
          </div>

          <Card className="p-4">
            <ApplicationPipelineSankey
              applications={applications}
              title="Application Pipeline"
              interactive
            />
          </Card>

          <Card className="p-4">
            <StatusTimelineChart
              data={charts.timeline}
              title="Status Over Time"
            />
          </Card>
        </div>
      )}
    </RequireSpreadsheet>
  );
}
