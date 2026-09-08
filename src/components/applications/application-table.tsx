import { Fragment, useState } from "react";
import type {
  Application,
  ApplicationFormData,
} from "../../types/application";
import {
  formatDateTime,
  formatRelativeDate,
  formatSalary,
} from "../../utils/formatters";
import { useApplications } from "../../hooks/use-applications";
import { LinkButton } from "../ui/button";
import { StatusBadge } from "./status-badge";
import { InterestBadge } from "./interest-badge";
import { StatusSelect } from "./status-select";
import { ApplicationForm } from "./application-form";

type SortField = "position" | "companyName" | "status" | "lastUpdated";
type SortDir = "asc" | "desc";

const HEADER_CLASS =
  "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";

function formatLocation(app: Application): string {
  const parts = [app.city, app.state, app.country].filter(Boolean);
  if (app.remote) {
    return parts.length > 0 ? `Remote (${parts.join(", ")})` : "Remote";
  }
  return parts.join(", ") || "—";
}

/** Cell whose content is clipped but readable via its tooltip. */
function TruncatedCell({ text, className = "" }: { text: string; className?: string }) {
  return (
    <td className="px-3 py-3">
      <span className={`block truncate text-sm ${className}`} title={text}>
        {text}
      </span>
    </td>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 text-indigo-400 hover:text-indigo-600"
      title={label}
    >
      ↗
    </a>
  );
}

export function ApplicationTable({
  applications,
}: {
  applications: Application[];
}) {
  const { updateApplication, deleteApplication } = useApplications();
  const [sortField, setSortField] = useState<SortField>("lastUpdated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
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
    const cmp = String(a[sortField]).localeCompare(String(b[sortField]));
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
      className={`cursor-pointer hover:text-gray-700 ${HEADER_CLASS}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
      </span>
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
          <col className="w-[8%]" />   {/* Updated */}
          <col className="w-[18%]" />  {/* Notes */}
          <col className="w-[11%]" />  {/* Actions */}
        </colgroup>
        <thead className="bg-gray-50">
          <tr>
            <SortHeader field="position">Role / Company</SortHeader>
            <th className={HEADER_CLASS}>Location</th>
            <th className={HEADER_CLASS}>Salary</th>
            <th className={HEADER_CLASS}>Interest</th>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="lastUpdated">Updated</SortHeader>
            <th className={HEADER_CLASS}>Notes</th>
            <th className={`text-right ${HEADER_CLASS}`}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((app) => (
            // Keyed on the Fragment so React tracks rows by id, not position
            <Fragment key={app.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <span
                      className="truncate text-sm font-medium text-gray-900"
                      title={app.position}
                    >
                      {app.position}
                    </span>
                    {app.jobPostingUrl && (
                      <ExternalLink
                        href={app.jobPostingUrl}
                        label="View job posting"
                      />
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
                      <ExternalLink
                        href={app.companyWebsite}
                        label="Company website"
                      />
                    )}
                  </div>
                </td>

                <TruncatedCell text={formatLocation(app)} className="text-gray-600" />
                <TruncatedCell
                  text={formatSalary(app.salaryMin, app.salaryMax, app.currency)}
                  className="text-gray-600"
                />

                <td className="px-3 py-3">
                  <InterestBadge interest={app.interest} />
                </td>

                <td className="px-3 py-3">
                  {editingStatusId === app.id ? (
                    <StatusSelect
                      current={app.status}
                      onChange={(status) => {
                        updateApplication(app.id, { status });
                        setEditingStatusId(null);
                      }}
                      onBlur={() => setEditingStatusId(null)}
                    />
                  ) : (
                    <button onClick={() => setEditingStatusId(app.id)}>
                      <StatusBadge status={app.status} />
                    </button>
                  )}
                </td>

                <td
                  className="px-3 py-3 text-sm text-gray-500"
                  title={formatDateTime(app.lastUpdated)}
                >
                  {formatRelativeDate(app.lastUpdated)}
                </td>

                <TruncatedCell text={app.notes || "—"} className="text-gray-500" />

                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <LinkButton
                      onClick={() =>
                        setEditingId(editingId === app.id ? null : app.id)
                      }
                      className="text-sm text-indigo-500 hover:text-indigo-700"
                    >
                      {editingId === app.id ? "Close" : "Edit"}
                    </LinkButton>
                    <LinkButton
                      onClick={() => {
                        if (window.confirm("Delete this application?")) {
                          deleteApplication(app.id);
                        }
                      }}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </LinkButton>
                  </div>
                </td>
              </tr>

              {editingId === app.id && (
                <tr>
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
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
