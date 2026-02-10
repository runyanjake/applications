import { useApplications } from "../hooks/use-applications";
import { useStorage } from "../hooks/use-storage";
import { PageHeader } from "../components/shared/page-header";
import { SummaryCards } from "../components/dashboard/summary-cards";
import { RecentApplications } from "../components/dashboard/recent-applications";
import { EmptyState } from "../components/shared/empty-state";
import { LoadingSpinner } from "../components/shared/loading-spinner";
import { SpreadsheetSetup } from "../components/dashboard/spreadsheet-setup";

export function DashboardPage() {
  const { isConfigured } = useStorage();
  const { applications, isLoading } = useApplications();

  if (!isConfigured) return <SpreadsheetSetup />;
  if (isLoading) return <LoadingSpinner className="py-32" />;

  return (
    <div>
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
    </div>
  );
}
