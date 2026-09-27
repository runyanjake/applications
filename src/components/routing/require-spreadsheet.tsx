import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useStorage } from "../../hooks/use-storage";
import { useApplications } from "../../hooks/use-applications";
import { ROUTES } from "../../config/routes";
import { SpreadsheetSetup } from "../storage/spreadsheet-setup";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";

/**
 * Gate for data pages: redirects home without a spreadsheet, waits for the
 * initial load, and surfaces load errors. Home renders setup in place (redirecting
 * to itself would loop).
 */
export function RequireSpreadsheet({ children }: { children: ReactNode }) {
  const { isConfigured } = useStorage();
  const { isLoading, loadError, reloadFromRemote } = useApplications();
  const location = useLocation();

  if (!isConfigured) {
    return location.pathname === ROUTES.HOME ? (
      <SpreadsheetSetup />
    ) : (
      <Navigate to={ROUTES.HOME} replace />
    );
  }

  if (isLoading) return <LoadingSpinner className="py-32" />;

  if (loadError) {
    return (
      <Alert
        tone="error"
        title="Could not load your applications"
        className="mx-auto mt-16 max-w-lg"
        actions={
          <Button size="sm" onClick={reloadFromRemote}>
            Retry
          </Button>
        }
      >
        {loadError}
      </Alert>
    );
  }

  return children;
}
