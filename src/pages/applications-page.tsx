import { useState } from "react";
import { Link } from "react-router-dom";
import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import type { ApplicationFilters } from "../types/application";
import { ROUTES } from "../config/routes";
import { PageHeader } from "../components/shared/page-header";
import { ApplicationFiltersBar } from "../components/applications/application-filters";
import { ApplicationTable } from "../components/applications/application-table";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";
import { EmptyState } from "../components/shared/empty-state";
import { LoadingSpinner } from "../components/shared/loading-spinner";

export function ApplicationsPage() {
  const { isConfigured } = useStorage();
  const { applications, isLoading, getFilteredApplications } =
    useApplications();
  const [filters, setFilters] = useState<ApplicationFilters>({});

  if (!isConfigured) return <SpreadsheetSetup />;
  if (isLoading) return <LoadingSpinner className="py-32" />;

  const filtered = getFilteredApplications(filters);

  return (
    <div>
      <PageHeader
        title="Applications"
        description={`${filtered.length} of ${applications.length} applications`}
        action={
          <Link
            to={ROUTES.ADD}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add Application
          </Link>
        }
      />

      <div className="mb-4">
        <ApplicationFiltersBar filters={filters} onChange={setFilters} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching applications"
          description={
            applications.length === 0
              ? "Add your first application to get started."
              : "Try adjusting your filters."
          }
        />
      ) : (
        <ApplicationTable applications={filtered} />
      )}
    </div>
  );
}
