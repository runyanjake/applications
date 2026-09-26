import { useEffect, useState } from "react";
import type { PickerDocument } from "../../types/google";
import {
  listSpreadsheets,
  type DriveSpreadsheet,
} from "../../services/google/drive-spreadsheets";
import { useAuth } from "../../hooks/use-auth";
import { describeGoogleError, isAuthError } from "../../utils/google-error";
import { createLogger } from "../../utils/logger";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { DocumentIcon } from "../ui/icons";
import { LoadingSpinner } from "../ui/loading-spinner";

const log = createLogger("spreadsheet-chooser");

const SEARCH_DEBOUNCE_MS = 300;

interface SpreadsheetChooserProps {
  onSelect: (doc: PickerDocument) => void;
  onCancel: () => void;
}

/**
 * In-app spreadsheet list backed by the Drive API — the desktop app's stand-in
 * for the Google Picker, which needs a Google web session the app doesn't have.
 */
export function SpreadsheetChooser({ onSelect, onCancel }: SpreadsheetChooserProps) {
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveSpreadsheet[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setFiles(null);
      setError(null);
      listSpreadsheets(query)
        .then((result) => {
          if (!cancelled) setFiles(result);
        })
        .catch((err: unknown) => {
          log.error("Listing spreadsheets failed:", err);
          if (!cancelled) setError(err);
        });
    }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const signOut = () => {
    onCancel();
    void logout();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spreadsheet-chooser-title"
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 p-4">
          <h2
            id="spreadsheet-chooser-title"
            className="mb-3 text-lg font-semibold text-gray-900"
          >
            Choose a Spreadsheet
          </h2>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto">
          {error != null ? (
            <Alert
              tone="error"
              title="Could not list your spreadsheets"
              className="m-4"
              actions={
                <>
                  <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
                    Retry
                  </Button>
                  {/* 403 can also mean the Drive API is disabled, so keep Retry */}
                  {isAuthError(error) && (
                    <Button variant="secondary" size="sm" onClick={signOut}>
                      Sign Out &amp; Sign In Again
                    </Button>
                  )}
                </>
              }
            >
              {describeGoogleError(error)}
            </Alert>
          ) : files == null ? (
            <LoadingSpinner className="py-12" />
          ) : files.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              {query
                ? `No spreadsheets match "${query}".`
                : "No spreadsheets found in your Google Drive."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(file)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <DocumentIcon className="h-5 w-5 shrink-0 text-green-600" />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                      {file.name}
                    </span>
                    {file.modifiedTime && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 p-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
