import type { ReactNode } from "react";
import { useGoogleApi } from "../../hooks/use-google-api";
import { LoadingSpinner } from "../shared/loading-spinner";

export function GoogleApiGate({ children }: { children: ReactNode }) {
  const { isReady, error, retry } = useGoogleApi();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <p className="mb-2 text-lg font-semibold text-red-600">
            Failed to load Google APIs
          </p>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <button
            onClick={retry}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
