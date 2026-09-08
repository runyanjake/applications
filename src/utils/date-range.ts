import type { ApplicationFilters, DatePreset } from "../types/application";

/** Trailing window length, in days, for each relative preset. */
const PRESET_DAYS: Record<Exclude<DatePreset, "all" | "custom">, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

/**
 * The presets offered by the picker. "custom" is absent on purpose — it is
 * entered by typing explicit dates, not by clicking a segment.
 */
export const DATE_PRESET_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
] as const satisfies readonly { value: DatePreset; label: string }[];

const PRESET_LABELS: Record<DatePreset, string> = {
  day: "Today",
  week: "Last 7 Days",
  month: "Last 30 Days",
  quarter: "Last 90 Days",
  year: "Last Year",
  all: "All Time",
  custom: "Custom Range",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inclusive YYYY-MM-DD bounds; an absent end means unbounded in that direction. */
export interface DateBounds {
  from?: string;
  to?: string;
}

/** The calendar day a timestamp falls on, matching the form's `dateApplied`. */
function toDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function datePresetOf(filters: ApplicationFilters): DatePreset {
  return filters.datePreset ?? "all";
}

/** Concrete day bounds for the filter's period — empty when it covers everything. */
export function resolveDateBounds(
  filters: ApplicationFilters,
  now: number = Date.now(),
): DateBounds {
  const preset = datePresetOf(filters);
  if (preset === "all") return {};
  if (preset === "custom") {
    return {
      from: filters.dateRange?.from || undefined,
      to: filters.dateRange?.to || undefined,
    };
  }
  // Trailing window ending today, with both ends inclusive
  return {
    from: toDay(now - (PRESET_DAYS[preset] - 1) * DAY_MS),
    to: toDay(now),
  };
}

/** True when a YYYY-MM-DD date or ISO timestamp falls inside the bounds. */
export function isWithinBounds(date: string, bounds: DateBounds): boolean {
  if (!date) return false;
  const day = date.slice(0, 10);
  if (bounds.from && day < bounds.from) return false;
  if (bounds.to && day > bounds.to) return false;
  return true;
}

/** True when the period narrows the data at all. */
export function isDateFilterActive(filters: ApplicationFilters): boolean {
  const bounds = resolveDateBounds(filters);
  return Boolean(bounds.from || bounds.to);
}

/**
 * A bare YYYY-MM-DD is a calendar day, not an instant — read it back in UTC so
 * a negative-offset timezone does not render it as the day before.
 */
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Human-readable period, for page headers and report titles. */
export function describeDateRange(filters: ApplicationFilters): string {
  const preset = datePresetOf(filters);
  if (preset !== "custom") return PRESET_LABELS[preset];

  const { from, to } = filters.dateRange ?? {};
  if (from && to) return `${formatDay(from)} – ${formatDay(to)}`;
  if (from) return `Since ${formatDay(from)}`;
  if (to) return `Through ${formatDay(to)}`;
  return PRESET_LABELS.all;
}
