import { useStorage } from "../../hooks/use-storage";

export function SpreadsheetCard() {
  const { spreadsheet, isConfigured, pickSpreadsheet, clearSpreadsheet } =
    useStorage();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Spreadsheet
      </h2>

      {isConfigured && spreadsheet ? (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <svg
              className="h-8 w-8 text-green-500"
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
            <div>
              <p className="font-medium text-gray-900">{spreadsheet.name}</p>
              <p className="text-xs text-gray-400">{spreadsheet.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={pickSpreadsheet}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Change Spreadsheet
            </button>
            <button
              onClick={clearSpreadsheet}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-gray-500">
            No spreadsheet selected. Pick one to start tracking applications.
          </p>
          <button
            onClick={pickSpreadsheet}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Select Spreadsheet
          </button>
        </div>
      )}
    </div>
  );
}
