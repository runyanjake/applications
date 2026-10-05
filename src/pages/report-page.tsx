import { useEffect, useMemo, useState } from "react";
import { useApplications } from "../hooks/use-applications";
import { ACTIVE_STATUSES, COMPLETE_STATUSES } from "../types/application";
import { formatDate } from "../utils/formatters";
import { getTimezone } from "../utils/timezone-store";
import {
  dayInTimezone,
  describeDateRange,
  isWithinBounds,
  resolveDateBounds,
} from "../utils/date-range";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState } from "../components/ui/empty-state";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationFiltersBar } from "../components/applications/application-filters";
import { ApplicationPipelineSankey } from "../components/charts/application-pipeline-sankey";
import { StatusBadge } from "../components/applications/status-badge";
import { createLogger } from "../utils/logger";

const log = createLogger("report");

const REPORT_TITLE = "PWS Applications — Status Report";

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
    applications,
    filters,
    setFilters,
    filteredApplications,
    applicationsIgnoringPeriod,
    activity,
  } = useApplications();

  const stats = useMemo(() => {
    const bounds = resolveDateBounds(filters);
    return {
      // Current state, so the period doesn't hide ongoing interviews
      active: applicationsIgnoringPeriod.filter((app) =>
        ACTIVE_STATUSES.includes(app.status),
      ),
      // By applied date: the period filter follows the latest change, not when it was sent
      sent: applicationsIgnoringPeriod.filter(
        (app) =>
          app.status !== "bookmarked" &&
          app.dateApplied &&
          isWithinBounds(app.dateApplied, bounds),
      ),
      transitioned: activity.filter(
        ({ change }) =>
          ACTIVE_STATUSES.includes(change.to) || COMPLETE_STATUSES.includes(change.to),
      ),
    };
  }, [filters, applicationsIgnoringPeriod, activity]);
  const nothingMatches =
    stats.active.length === 0 &&
    stats.sent.length === 0 &&
    activity.length === 0 &&
    filteredApplications.length === 0;

  // The PDF's title metadata comes from document.title
  useEffect(() => {
    const previous = document.title;
    document.title = REPORT_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const periodLabel = describeDateRange(filters);

  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleDownload = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const fileName = `PWS Applications Report ${dayInTimezone()}.pdf`;
      const path = await window.electronAPI.report.savePdf(fileName);
      if (path) setSaveResult({ ok: true, message: `Saved to ${path}` });
    } catch (err) {
      log.error("PDF export failed:", err);
      setSaveResult({ ok: false, message: "Could not save the PDF." });
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: getTimezone(),
  });

  // A report over nothing is just zeroes — say so rather than printing them
  if (applications.length === 0) {
    return (
      <RequireSpreadsheet>
        <PageHeader title="Report" />
        <EmptyState
          title="Nothing to report yet"
          description="Add some applications to generate a status report."
        />
      </RequireSpreadsheet>
    );
  }

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
            onClick={handleDownload}
            disabled={saving || nothingMatches}
          >
            {saving ? "Saving…" : "Download PDF"}
          </Button>
        </div>
        {saveResult && (
          <p
            className={`text-right text-xs print:hidden ${saveResult.ok ? "text-gray-500" : "text-red-600"}`}
          >
            {saveResult.message}
          </p>
        )}

        {nothingMatches ? (
          <EmptyState
            title="No applications match these filters"
            description="Widen the period or clear filters to generate a report."
          />
        ) : (
          // Laid out at the PDF's printable width (Letter, 0.4in margins) so the
          // on-screen chart is drawn at print size. Print: no tinted panel, no page splits.
          <div className="mx-auto max-w-[7.7in] space-y-6 rounded-xl bg-gray-50 p-6 print:bg-white">
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{REPORT_TITLE}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {periodLabel} · Generated {today}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 break-inside-avoid">
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

            <Card className="break-inside-avoid p-4">
              <ApplicationPipelineSankey
                applications={filteredApplications}
                title="Application Pipeline"
              />
            </Card>

            {activity.length > 0 && (
              <Card className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">
                  Activity — {periodLabel}
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pr-4">Company</th>
                      <th className="pb-2 pr-4">Position</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Changed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {activity.map(({ app, change }) => (
                      <tr key={`${app.id}-${change.ts}`} className="break-inside-avoid">
                        <td className="py-2 pr-4 font-medium text-gray-900">
                          {app.companyName}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{app.position}</td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={change.to} />
                        </td>
                        <td className="whitespace-nowrap py-2 text-gray-500">
                          {formatDate(change.ts)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    </RequireSpreadsheet>
  );
}
