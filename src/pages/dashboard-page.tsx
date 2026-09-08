import { useApplications } from "../hooks/use-applications";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState } from "../components/ui/empty-state";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { ApplicationFiltersBar } from "../components/applications/application-filters";
import { SummaryCards } from "../components/dashboard/summary-cards";
import { RecentApplications } from "../components/dashboard/recent-applications";
import { describeDateRange } from "../utils/date-range";

export function DashboardPage() {
  const { applications, filters, setFilters, filteredApplications, dateBounds } =
    useApplications();

  return (
    <RequireSpreadsheet>
      <PageHeader
        title="Dashboard"
        description={
          applications.length > 0
            ? `${filteredApplications.length} of ${applications.length} applications · ${describeDateRange(filters)}`
            : undefined
        }
        action={
          applications.length > 0 ? (
            <ApplicationFiltersBar
              filters={filters}
              onChange={setFilters}
              variant="period"
            />
          ) : undefined
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Start tracking your job applications by adding your first one."
        />
      ) : (
        <>
          <SummaryCards applications={filteredApplications} />
          <div className="mt-8">
            <RecentApplications
              applications={filteredApplications}
              bounds={dateBounds}
              periodLabel={describeDateRange(filters)}
            />
          </div>
        </>
      )}
    </RequireSpreadsheet>
  );
}
