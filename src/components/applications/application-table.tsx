import { useState } from "react";
import type { Application, ApplicationFormData, ApplicationStatus } from "../../types/application";
import {
  STATUS_TRANSITIONS,
  STATUS_CATEGORY,
} from "../../types/application";
import { formatRelativeDate, formatSalary, formatStatus } from "../../utils/formatters";
import { StatusBadge } from "./status-badge";
import { useApplications } from "../../hooks/use-applications";
import { ApplicationForm } from "./application-form";

interface ApplicationTableProps {
  applications: Application[];
}

type SortField = "position" | "companyName" | "status" | "lastUpdated";
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
  const [sortField, setSortField] = useState<SortField>("lastUpdated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      onClick={() => handleSort(field)}
      className={`cursor-pointer px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  );

  const ColHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}>
      {children}
    </th>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <table className="w-full table-fixed divide-y divide-gray-200">
        <colgroup>
          <col className="w-[22%]" />  {/* Position / Company */}
          <col className="w-[11%]" />  {/* Location */}
          <col className="w-[10%]" />  {/* Salary */}
          <col className="w-[7%]" />   {/* Interest */}
          <col className="w-[13%]" />  {/* Status */}
          <col className="w-[8%]" />   {/* Applied */}
          <col className="w-[18%]" />  {/* Notes */}
          <col className="w-[11%]" />  {/* Actions */}
        </colgroup>
        <thead className="bg-gray-50">
          <tr>
            <SortHeader field="position">Role / Company</SortHeader>
            <ColHeader>Location</ColHeader>
            <ColHeader>Salary</ColHeader>
            <ColHeader>Interest</ColHeader>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="lastUpdated">Updated</SortHeader>
            <ColHeader>Notes</ColHeader>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((app) => (
            <>
              <tr key={app.id} className="hover:bg-gray-50">
                {/* Position + Company (stacked) */}
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <span
                      className="truncate text-sm font-medium text-gray-900"
                      title={app.position}
                    >
                      {app.position}
                    </span>
                    {app.jobPostingUrl && (
                      <a
                        href={app.jobPostingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-indigo-400 hover:text-indigo-600"
                        title="View job posting"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span
                      className="truncate text-xs text-gray-500"
                      title={app.companyName}
                    >
                      {app.companyName}
                    </span>
                    {app.companyWebsite && (
                      <a
                        href={app.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-indigo-400 hover:text-indigo-600"
                        title="Company website"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </td>

                {/* Location */}
                <td className="px-3 py-3">
                  <span
                    className="block truncate text-sm text-gray-600"
                    title={formatLocation(app)}
                  >
                    {formatLocation(app)}
                  </span>
                </td>

                {/* Salary */}
                <td className="px-3 py-3">
                  <span
                    className="block truncate text-sm text-gray-600"
                    title={formatSalary(app.salaryMin, app.salaryMax, app.currency)}
                  >
                    {formatSalary(app.salaryMin, app.salaryMax, app.currency)}
                  </span>
                </td>

                {/* Interest */}
                <td className="px-3 py-3">
                  <InterestBadge interest={app.interest} />
                </td>

                {/* Status (inline edit) */}
                <td className="px-3 py-3">
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

                {/* Last Updated */}
                <td className="px-3 py-3 text-sm text-gray-500" title={new Date(app.lastUpdated).toLocaleString()}>
                  {formatRelativeDate(app.lastUpdated)}
                </td>

                {/* Notes */}
                <td className="px-3 py-3">
                  <span
                    className="block truncate text-sm text-gray-500"
                    title={app.notes || undefined}
                  >
                    {app.notes || "—"}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingId(editingId === app.id ? null : app.id)}
                      className="text-sm text-indigo-500 hover:text-indigo-700"
                    >
                      {editingId === app.id ? "Close" : "Edit"}
                    </button>
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
                  </div>
                </td>
              </tr>
              {editingId === app.id && (
                <tr key={`${app.id}-edit`}>
                  <td colSpan={8} className="bg-gray-50 px-6 py-4">
                    <div className="rounded-lg border border-indigo-100 bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-sm font-semibold text-gray-700">
                        Edit Application
                      </h3>
                      <ApplicationForm
                        initial={app}
                        submitLabel="Save Changes"
                        onCancel={() => setEditingId(null)}
                        onSubmit={async (data: ApplicationFormData) => {
                          updateApplication(app.id, data);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </>
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
      className="w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs"
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
