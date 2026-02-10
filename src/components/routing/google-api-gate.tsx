import type { ReactNode } from "react";
import { useGoogleApi } from "../../hooks/use-google-api";
import { LoadingSpinner } from "../shared/loading-spinner";

export function GoogleApiGate({ children }: { children: ReactNode }) {
  const { isReady } = useGoogleApi();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-sm text-gray-500">Loading Google APIs...</p>
        </div>
      </div>
    );
  }

  return children;
}
