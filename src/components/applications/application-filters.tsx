import { useState } from "react";
import {
  INTEREST_LEVELS,
  type ApplicationFilters,
  type DatePreset,
} from "../../types/application";
import { formatInterest } from "../../utils/formatters";
import { DATE_PRESET_OPTIONS, datePresetOf } from "../../utils/date-range";
import { Card } from "../ui/card";
import { SegmentedControl } from "../ui/segmented-control";
import { StatusOptionGroups } from "./status-options";

interface ApplicationFiltersBarProps {
  filters: ApplicationFilters;
  onChange: (filters: ApplicationFilters) => void;
  className?: string;
}

const smallSelect =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm";

/** The compact sibling of `inputClass`, sized to sit level with the buttons. */
const smallInput =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

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

/**
 * Count of the filters hidden behind the Filters button. The period and the
 * search box are always on screen, so counting them would be double-reporting.
 */
function countHidden(filters: ApplicationFilters): number {
  return (
    (filters.status?.length ? 1 : 0) +
    (filters.interest?.length ? 1 : 0) +
    (filters.remote != null ? 1 : 0)
  );
}

export function ApplicationFiltersBar({
  filters,
  onChange,
  className = "",
}: ApplicationFiltersBarProps) {
  const preset = datePresetOf(filters);
  // Open the drawer on custom periods so the dates driving the view are visible
  const [expanded, setExpanded] = useState(preset === "custom");

  const update = (patch: Partial<ApplicationFilters>) =>
    onChange({ ...filters, ...patch });

  const selectPreset = (next: DatePreset) =>
    update({ datePreset: next, dateRange: undefined });

  /** Typing an explicit date is what puts the period into "custom". */
  const setCustomRange = (from: string, to: string) =>
    from || to
      ? update({ datePreset: "custom", dateRange: { from, to } })
      : update({ datePreset: "all", dateRange: undefined });

  const hiddenCount = countHidden(filters);
  const canClear = hiddenCount > 0 || preset !== "all";

  // "Custom" is reachable only through the date inputs, so it appears as a
  // segment just to show where the current period came from.
  const presetOptions =
    preset === "custom"
      ? [...DATE_PRESET_OPTIONS, { value: "custom" as const, label: "Custom" }]
      : DATE_PRESET_OPTIONS;

  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          options={presetOptions}
          value={preset}
          onChange={selectPreset}
          size="sm"
        />

        <input
          type="text"
          placeholder="Search position, company, or notes..."
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className={`min-w-[12rem] flex-1 ${smallInput}`}
        />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Filters
          {hiddenCount > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
              {hiddenCount}
            </span>
          )}
          <span className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</span>
        </button>

        {canClear && (
          <button
            type="button"
            onClick={() =>
              onChange({ search: filters.search, datePreset: "all" })
            }
            className="whitespace-nowrap px-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
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

          <FilterField label="Custom Date Applied">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={preset === "custom" ? (filters.dateRange?.from ?? "") : ""}
                onChange={(e) =>
                  setCustomRange(
                    e.target.value,
                    preset === "custom" ? (filters.dateRange?.to ?? "") : "",
                  )
                }
                className={smallSelect}
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={preset === "custom" ? (filters.dateRange?.to ?? "") : ""}
                onChange={(e) =>
                  setCustomRange(
                    preset === "custom" ? (filters.dateRange?.from ?? "") : "",
                    e.target.value,
                  )
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
