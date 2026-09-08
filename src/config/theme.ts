import type { ApplicationStatus, InterestLevel } from "../types/application";

/**
 * Single source of truth for status/interest colours.
 * `*_HEX` values feed the charts, `*_BADGE` values feed Tailwind pills.
 */
export const STATUS_HEX: Record<ApplicationStatus, string> = {
  bookmarked: "#9ca3af",
  applied: "#818cf8",
  interviewing: "#fbbf24",
  offered: "#34d399",
  rejected: "#f87171",
  withdrawn: "#fb923c",
  ghosted: "#a78bfa",
};

export const STATUS_BADGE: Record<ApplicationStatus, string> = {
  bookmarked: "bg-gray-100 text-gray-700",
  applied: "bg-indigo-100 text-indigo-700",
  interviewing: "bg-yellow-100 text-yellow-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-orange-100 text-orange-700",
  ghosted: "bg-purple-100 text-purple-700",
};

export const INTEREST_BADGE: Record<InterestLevel, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

/** Categorical palette for series with no intrinsic colour (companies, etc.). */
export const SERIES_PALETTE = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#94a3b8",
] as const;

export const FALLBACK_COLOR = "#94a3b8";

export function paletteColor(index: number): string {
  return SERIES_PALETTE[index % SERIES_PALETTE.length] ?? FALLBACK_COLOR;
}
