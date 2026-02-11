import { useState } from "react";
import {
  INTEREST_LEVELS,
  PRE_INTERVIEW_STATUSES,
  ACTIVE_STATUSES,
  COMPLETE_STATUSES,
  type ApplicationFilters,
} from "../../types/application";
import { formatStatus } from "../../utils/formatters";

interface ApplicationFiltersBarProps {
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
}

export function ApplicationFiltersBar({
  filters,
  onChange,
}: ApplicationFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<ApplicationFilters>) =>
    onChange({ ...filters, ...patch });

  const activeCount =
    (filters.status?.length ? 1 : 0) +
    (filters.interest?.length ? 1 : 0) +
    (filters.remote != null ? 1 : 0) +
    (filters.dateRange?.from || filters.dateRange?.to ? 1 : 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by position, company, or notes..."
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ search: filters.search })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Status
            </label>
            <select
              multiple
              value={filters.status ?? []}
              onChange={(e) =>
                update({
                  status: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value,
                  ) as ApplicationFilters["status"],
                })
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <optgroup label="Pre-Interview">
                {PRE_INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </optgroup>
              <optgroup label="Active">
                {ACTIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </optgroup>
              <optgroup label="Complete">
                {COMPLETE_STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Interest
            </label>
            <select
              multiple
              value={filters.interest ?? []}
              onChange={(e) =>
                update({
                  interest: Array.from(
                    e.target.selectedOptions,
                    (o) => o.value,
                  ) as ApplicationFilters["interest"],
                })
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {INTEREST_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Remote
            </label>
            <select
              value={
                filters.remote == null ? "" : filters.remote ? "yes" : "no"
              }
              onChange={(e) =>
                update({
                  remote:
                    e.target.value === ""
                      ? null
                      : e.target.value === "yes",
                })
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="yes">Remote</option>
              <option value="no">On-site</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date Applied
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateRange?.from ?? ""}
                onChange={(e) =>
                  update({
                    dateRange: {
                      from: e.target.value,
                      to: filters.dateRange?.to ?? "",
                    },
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={filters.dateRange?.to ?? ""}
                onChange={(e) =>
                  update({
                    dateRange: {
                      from: filters.dateRange?.from ?? "",
                      to: e.target.value,
                    },
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
