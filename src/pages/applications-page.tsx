import { Link } from "react-router-dom";
import { useApplications } from "../hooks/use-applications";
import { ROUTES } from "../config/routes";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState } from "../components/ui/empty-state";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationFiltersBar } from "../components/applications/application-filters";
import { ApplicationTable } from "../components/applications/application-table";

export function ApplicationsPage() {
  const { applications, filters, setFilters, filteredApplications } =
    useApplications();

  return (
    <RequireSpreadsheet>
      <PageHeader
        title="Applications"
        description={`${filteredApplications.length} of ${applications.length} applications`}
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

      {filteredApplications.length === 0 ? (
        <EmptyState
          title="No matching applications"
          description={
            applications.length === 0
              ? "Add your first application to get started."
              : "Try adjusting your filters."
          }
        />
      ) : (
        <ApplicationTable applications={filteredApplications} />
      )}
    </RequireSpreadsheet>
  );
}
