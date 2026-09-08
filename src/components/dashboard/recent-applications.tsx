import { useState } from "react";
import { Link } from "react-router-dom";
import type { Application } from "../../types/application";
import { ROUTES } from "../../config/routes";
import { formatRelativeDate } from "../../utils/formatters";
import { SegmentedControl } from "../ui/segmented-control";
import { StatusBadge } from "../applications/status-badge";

type Period = "day" | "week" | "month" | "quarter" | "year";

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIODS = [
  { value: "day", label: "Day", days: 1 },
  { value: "week", label: "Week", days: 7 },
  { value: "month", label: "Month", days: 30 },
  { value: "quarter", label: "Quarter", days: 90 },
  { value: "year", label: "Year", days: 365 },
] as const satisfies readonly { value: Period; label: string; days: number }[];

const HEADER_CLASS =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";

export function RecentApplications({
  applications,
}: {
  applications: Application[];
}) {
  const [period, setPeriod] = useState<Period>("day");

  const selected = PERIODS.find((p) => p.value === period) ?? PERIODS[0];
  const cutoff = Date.now() - selected.days * DAY_MS;

  const recent = applications
    .filter((app) => new Date(app.lastUpdated).getTime() >= cutoff)
    .sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Applications
        </h2>
        <Link
          to={ROUTES.APPLICATIONS}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      <SegmentedControl
        options={PERIODS}
        value={period}
        onChange={setPeriod}
        size="sm"
        className="mb-3"
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No applications updated in the past{" "}
            {selected.label.toLowerCase()}.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={HEADER_CLASS}>Position</th>
                <th className={HEADER_CLASS}>Company</th>
                <th className={HEADER_CLASS}>Status</th>
                <th className={HEADER_CLASS}>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recent.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {app.position}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {app.companyName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatRelativeDate(app.lastUpdated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
