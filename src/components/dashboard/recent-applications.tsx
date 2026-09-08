import { Link } from "react-router-dom";
import type { Application } from "../../types/application";
import { ROUTES } from "../../config/routes";
import { formatRelativeDate } from "../../utils/formatters";
import { isWithinBounds, type DateBounds } from "../../utils/date-range";
import { StatusBadge } from "../applications/status-badge";

const HEADER_CLASS =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";

interface RecentApplicationsProps {
  applications: Application[];
  /** The shared period, applied to `lastUpdated` rather than `dateApplied`. */
  bounds: DateBounds;
  periodLabel: string;
}

export function RecentApplications({
  applications,
  bounds,
  periodLabel,
}: RecentApplicationsProps) {
  // This list is about recent activity, so it keys on when a record last moved
  const recent = applications
    .filter((app) => isWithinBounds(app.lastUpdated, bounds))
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-400">
            No applications updated in this period ({periodLabel}).
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
