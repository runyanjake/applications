import { useState } from "react";
import type { Application, ApplicationStatus } from "../../types/application";
import {
  STATUS_TRANSITIONS,
  STATUS_CATEGORY,
} from "../../types/application";
import { formatDate, formatSalary, formatStatus } from "../../utils/formatters";
import { StatusBadge } from "./status-badge";
import { useApplications } from "../../hooks/use-applications";

interface ApplicationTableProps {
  applications: Application[];
}

type SortField = "position" | "companyName" | "status" | "dateApplied";
type SortDir = "asc" | "desc";

function formatLocation(app: Application): string {
  if (app.remote) {
    const parts = [app.city, app.state, app.country].filter(Boolean);
    return parts.length > 0 ? `Remote (${parts.join(", ")})` : "Remote";
  }
  const parts = [app.city, app.state, app.country].filter(Boolean);
  return parts.join(", ") || "—";
}

export function ApplicationTable({ applications }: ApplicationTableProps) {
  const { updateApplication, deleteApplication } = useApplications();
  const [sortField, setSortField] = useState<SortField>("dateApplied");
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

  const ColHeader = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader field="position">Position</SortHeader>
            <SortHeader field="companyName">Company</SortHeader>
            <ColHeader>Location</ColHeader>
            <ColHeader>Salary</ColHeader>
            <ColHeader>Interest</ColHeader>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="dateApplied">Applied</SortHeader>
            <ColHeader>Notes</ColHeader>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50">
              {/* Position + job posting link */}
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

              {/* Company + website */}
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm text-gray-900">{app.companyName}</div>
                {app.companyWebsite && (
                  <a
                    href={app.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    Website
                  </a>
                )}
              </td>

              {/* Location */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatLocation(app)}
              </td>

              {/* Salary */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatSalary(app.salaryMin, app.salaryMax, app.currency)}
              </td>

              {/* Interest */}
              <td className="whitespace-nowrap px-4 py-3">
                <InterestBadge interest={app.interest} />
              </td>

              {/* Status (inline edit) */}
              <td className="whitespace-nowrap px-4 py-3">
                {editingStatus === app.id ? (
                  <StatusSelect
                    current={app.status}
                    onChange={(s) => {
                      updateApplication(app.id, { status: s });
                      setEditingStatus(null);
                    }}
                    onBlur={() => setEditingStatus(null)}
                  />
                ) : (
                  <button onClick={() => setEditingStatus(app.id)}>
                    <StatusBadge status={app.status} />
                  </button>
                )}
              </td>

              {/* Date Applied */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(app.dateApplied)}
              </td>

              {/* Notes (truncated) */}
              <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500" title={app.notes}>
                {app.notes || "—"}
              </td>

              {/* Actions */}
              <td className="whitespace-nowrap px-4 py-3 text-right">
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

const INTEREST_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

function InterestBadge({ interest }: { interest: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${INTEREST_COLORS[interest] ?? "bg-gray-100 text-gray-600"}`}
    >
      {interest}
    </span>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  "pre-interview": "Pre-Interview",
  active: "Active",
  complete: "Complete",
};

const CATEGORY_OPTION_COLOR: Record<string, string> = {
  "pre-interview": "#4338ca",  // indigo
  active: "#b45309",           // amber
  complete: "#047857",         // green
};

function StatusSelect({
  current,
  onChange,
  onBlur,
}: {
  current: ApplicationStatus;
  onChange: (s: ApplicationStatus) => void;
  onBlur: () => void;
}) {
  const options = [current, ...STATUS_TRANSITIONS[current]];
  // Group options by category
  const groups = new Map<string, ApplicationStatus[]>();
  for (const s of options) {
    const cat = STATUS_CATEGORY[s];
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(s);
  }

  return (
    <select
      value={current}
      autoFocus
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      className="rounded border border-gray-300 px-1.5 py-0.5 text-xs"
    >
      {Array.from(groups.entries()).map(([cat, statuses]) => (
        <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
          {statuses.map((s) => (
            <option key={s} value={s} style={{ color: CATEGORY_OPTION_COLOR[cat] }}>
              {formatStatus(s)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
