import { useStorage } from "../../hooks/use-storage";

export function SpreadsheetSetup() {
  const { pickSpreadsheet } = useStorage();

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
      <button
        onClick={pickSpreadsheet}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Select Spreadsheet
      </button>
    </div>
  );
}
