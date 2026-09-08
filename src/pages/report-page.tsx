import { useMemo } from "react";
import { useApplications } from "../hooks/use-applications";
import { ACTIVE_STATUSES, COMPLETE_STATUSES } from "../types/application";
import { STATUS_HEX } from "../config/theme";
import { formatStatus } from "../utils/formatters";
import { describeDateRange, isWithinBounds } from "../utils/date-range";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationFiltersBar } from "../components/applications/application-filters";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";

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
  const {
    filters,
    setFilters,
    filteredApplications,
    dateBounds,
    getFilteredApplications,
  } = useApplications();

  // Status changes are keyed on lastUpdated, so the period has to be applied to
  // that date instead of dateApplied — an application sent a year ago can still
  // have moved this week. Everything else the filters say still holds.
  const regardlessOfPeriod = useMemo(
    () =>
      getFilteredApplications({
        ...filters,
        datePreset: "all",
        dateRange: undefined,
      }),
    [getFilteredApplications, filters],
  );

  const stats = useMemo(
    () => ({
      active: filteredApplications.filter((app) =>
        ACTIVE_STATUSES.includes(app.status),
      ),
      sent: filteredApplications.filter(
        (app) => app.status !== "bookmarked" && app.dateApplied,
      ),
      transitioned: regardlessOfPeriod.filter(
        (app) =>
          isWithinBounds(app.lastUpdated, dateBounds) &&
          (ACTIVE_STATUSES.includes(app.status) ||
            COMPLETE_STATUSES.includes(app.status)),
      ),
    }),
    [filteredApplications, regardlessOfPeriod, dateBounds],
  );

  const periodLabel = describeDateRange(filters);

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <RequireSpreadsheet>
      <div className="space-y-4">
        {/* Controls — hidden when printing */}
        <div className="flex items-start gap-3 print:hidden">
          <ApplicationFiltersBar
            filters={filters}
            onChange={setFilters}
            className="flex-1"
          />
          {/* mt-3 clears the filter card's padding so both sit on one line */}
          <Button
            size="sm"
            className="mt-3 whitespace-nowrap"
            onClick={() => window.print()}
          >
            Download PDF
          </Button>
        </div>

        <div className="space-y-6 rounded-xl bg-gray-50 p-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              PWS Applications — Status Report
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {periodLabel} · Generated {today}
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
              caption={periodLabel}
            />
            <StatCard
              label="Status Changes"
              value={stats.transitioned.length}
              caption="moved to active or complete"
            />
          </div>

          <Card className="p-4">
            <ApplicationPipelineSankey
              applications={filteredApplications}
              title="Application Pipeline"
            />
          </Card>

          {stats.transitioned.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Status Changes — {periodLabel}
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
