import type { Application, ApplicationFilters } from "../types/application";
import type { DateBounds } from "./date-range";

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * True when an application satisfies every active filter.
 *
 * The period arrives pre-resolved as `bounds` so a relative preset is turned
 * into concrete days once per pass rather than once per application.
 */
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
  if (bounds.from && app.dateApplied < bounds.from) {
    return false;
  }
  if (bounds.to && app.dateApplied > bounds.to) {
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
