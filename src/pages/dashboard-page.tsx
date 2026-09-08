import { useApplications } from "../hooks/use-applications";
import { PageHeader } from "../components/ui/page-header";
import { EmptyState } from "../components/ui/empty-state";
import { RequireSpreadsheet } from "../components/routing/require-spreadsheet";
import { SummaryCards } from "../components/dashboard/summary-cards";
import { RecentApplications } from "../components/dashboard/recent-applications";

export function DashboardPage() {
  const { applications } = useApplications();

  return (
    <RequireSpreadsheet>
      <PageHeader title="Dashboard" />

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Start tracking your job applications by adding your first one."
        />
      ) : (
        <>
          <SummaryCards applications={applications} />
          <div className="mt-8">
            <RecentApplications applications={applications} />
          </div>
        </>
      )}
    </RequireSpreadsheet>
  );
}
