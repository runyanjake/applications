import type { Application, ApplicationFilters } from "../types/application";

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** True when an application satisfies every active filter. */
export function matchesFilters(
  app: Application,
  filters: ApplicationFilters,
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
  if (filters.dateRange?.from && app.dateApplied < filters.dateRange.from) {
    return false;
  }
  if (filters.dateRange?.to && app.dateApplied > filters.dateRange.to) {
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
