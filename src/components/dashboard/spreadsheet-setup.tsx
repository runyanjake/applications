import { useStorage } from "../../hooks/use-storage";

export function SpreadsheetSetup() {
  const {
    pickSpreadsheet,
    validationError,
    pendingSheetCreation,
    confirmSheetCreation,
    cancelSheetCreation,
  } = useStorage();

  return (
    <div className="py-16 text-center">
      <svg
        className="mx-auto mb-4 h-16 w-16 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Choose a Spreadsheet
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
        Select a Google Spreadsheet to store your job applications. You can
        pick an existing one or create a new spreadsheet first in Google Drive.
      </p>

      {validationError && (
        <div className="mx-auto mb-6 max-w-md rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-left">
          <p className="font-semibold mb-1">Could not use that spreadsheet</p>
          <p>{validationError}</p>
        </div>
      )}

      {pendingSheetCreation && (
        <div className="mx-auto mb-6 max-w-md rounded-md border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="mb-1 text-sm font-semibold text-amber-800">
            No "Applications" sheet found
          </p>
          <p className="mb-3 text-sm text-amber-700">
            <span className="font-medium">{pendingSheetCreation.name}</span> doesn't
            have an "Applications" sheet. PWS Applications will create one for
            you. Any existing sheets in this file will not be affected.
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmSheetCreation}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Create Sheet & Continue
            </button>
            <button
              onClick={cancelSheetCreation}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!pendingSheetCreation && (
        <button
          onClick={pickSpreadsheet}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {validationError ? "Try Another Spreadsheet" : "Select Spreadsheet"}
        </button>
      )}
    </div>
  );
}
