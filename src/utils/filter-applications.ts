import type { Application, ApplicationFilters } from "../types/application";
import { isWithinBounds, type DateBounds } from "./date-range";
import { lastEventTs } from "./activity";

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Matches every active filter; `bounds` is the period resolved once per pass. */
export function matchesFilters(
  app: Application,
  filters: ApplicationFilters,
  bounds: DateBounds,
): boolean {
  if (filters.status?.length && !filters.status.includes(app.status)) {
    return false;
  }
  if (filters.interest?.length && !filters.interest.includes(app.interest)) {
    return false;
  }
  if (filters.companyName && !includesText(app.companyName, filters.companyName)) {
    return false;
  }
  if (filters.remote != null && app.remote !== filters.remote) {
    return false;
  }
  // The period follows the latest status change, so recent moves on old applications count
  if ((bounds.from || bounds.to) && !isWithinBounds(lastEventTs(app), bounds)) {
    return false;
  }
  if (filters.search) {
    return (
      includesText(app.position, filters.search) ||
      includesText(app.companyName, filters.search) ||
      includesText(app.notes, filters.search)
    );
  }
  return true;
}
