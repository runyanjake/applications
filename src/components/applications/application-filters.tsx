import { useState } from "react";
import {
  INTEREST_LEVELS,
  type ApplicationFilters,
} from "../../types/application";
import { formatInterest } from "../../utils/formatters";
import { Card } from "../ui/card";
import { inputClass } from "../ui/field";
import { StatusOptionGroups } from "./status-options";

interface ApplicationFiltersBarProps {
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
}

const smallSelect =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Count of active filters, ignoring the always-visible search box. */
function countActive(filters: ApplicationFilters): number {
  return (
    (filters.status?.length ? 1 : 0) +
    (filters.interest?.length ? 1 : 0) +
    (filters.remote != null ? 1 : 0) +
    (filters.dateRange?.from || filters.dateRange?.to ? 1 : 0)
  );
}

export function ApplicationFiltersBar({
  filters,
  onChange,
}: ApplicationFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<ApplicationFilters>) =>
    onChange({ ...filters, ...patch });

  const activeCount = countActive(filters);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by position, company, or notes..."
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="button"
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
            type="button"
            onClick={() => onChange({ search: filters.search })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Status">
            <select
              multiple
              value={filters.status ?? []}
              onChange={(e) =>
                update({
                  status: Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ) as ApplicationFilters["status"],
                })
              }
              className={smallSelect}
            >
              <StatusOptionGroups />
            </select>
          </FilterField>

          <FilterField label="Interest">
            <select
              multiple
              value={filters.interest ?? []}
              onChange={(e) =>
                update({
                  interest: Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ) as ApplicationFilters["interest"],
                })
              }
              className={smallSelect}
            >
              {INTEREST_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {formatInterest(level)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Remote">
            <select
              value={filters.remote == null ? "" : filters.remote ? "yes" : "no"}
              onChange={(e) =>
                update({
                  remote: e.target.value === "" ? null : e.target.value === "yes",
                })
              }
              className={smallSelect}
            >
              <option value="">All</option>
              <option value="yes">Remote</option>
              <option value="no">On-site</option>
            </select>
          </FilterField>

          <FilterField label="Date Applied">
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
                className={smallSelect}
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
                className={smallSelect}
              />
            </div>
          </FilterField>
        </div>
      )}
    </Card>
  );
}
