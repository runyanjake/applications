import { useState } from "react";
import type { Application, ApplicationStatus } from "../../types/application";
import { APPLICATION_STATUSES } from "../../types/application";
import { formatDate, formatSalary, formatStatus } from "../../utils/formatters";
import { StatusBadge } from "./status-badge";
import { useApplications } from "../../hooks/use-applications";

interface ApplicationTableProps {
  applications: Application[];
}

type SortField = "position" | "companyName" | "status" | "dateApplied" | "lastUpdated";
type SortDir = "asc" | "desc";

export function ApplicationTable({ applications }: ApplicationTableProps) {
  const { updateApplication, deleteApplication } = useApplications();
  const [sortField, setSortField] = useState<SortField>("lastUpdated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...applications].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    const cmp = String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <th
      onClick={() => handleSort(field)}
      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader field="position">Position</SortHeader>
            <SortHeader field="companyName">Company</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Location
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Salary
            </th>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="dateApplied">Applied</SortHeader>
            <SortHeader field="lastUpdated">Updated</SortHeader>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {app.position}
                </div>
                {app.jobPostingUrl && (
                  <a
                    href={app.jobPostingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    View posting
                  </a>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm text-gray-900">
                  {app.companyName}
                </div>
                {app.companyWebsite && (
                  <a
                    href={app.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Website
                  </a>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {app.remote ? (
                  <span className="text-green-600">Remote</span>
                ) : (
                  [app.city, app.state, app.country]
                    .filter(Boolean)
                    .join(", ") || "\u2014"
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatSalary(app.salaryMin, app.salaryMax, app.currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {editingStatus === app.id ? (
                  <select
                    value={app.status}
                    autoFocus
                    onBlur={() => setEditingStatus(null)}
                    onChange={async (e) => {
                      await updateApplication(app.id, {
                        status: e.target.value as ApplicationStatus,
                      });
                      setEditingStatus(null);
                    }}
                    className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button onClick={() => setEditingStatus(app.id)}>
                    <StatusBadge status={app.status} />
                  </button>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(app.dateApplied)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(app.lastUpdated)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <button
                  onClick={() => {
                    if (window.confirm("Delete this application?")) {
                      deleteApplication(app.id);
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
