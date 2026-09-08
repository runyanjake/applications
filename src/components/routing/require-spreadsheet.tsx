import type { ReactNode } from "react";
import { useStorage } from "../../hooks/use-storage";
import { useApplications } from "../../hooks/use-applications";
import { SpreadsheetSetup } from "../storage/spreadsheet-setup";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";

/**
 * Gate for every page that reads application data: prompts for a spreadsheet,
 * waits for the initial load, and shows why that load failed instead of
 * leaving the page silently empty.
 */
export function RequireSpreadsheet({ children }: { children: ReactNode }) {
  const { isConfigured } = useStorage();
  const { isLoading, loadError, reloadFromRemote } = useApplications();

  if (!isConfigured) return <SpreadsheetSetup />;
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
