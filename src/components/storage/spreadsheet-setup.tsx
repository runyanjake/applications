import { useStorage } from "../../hooks/use-storage";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { DocumentIcon } from "../ui/icons";
import { SheetCreationPrompt } from "./sheet-creation-prompt";

/** First-run screen shown on every page until a spreadsheet is connected. */
export function SpreadsheetSetup() {
  const { pickSpreadsheet, error, isPicking, pendingSheetCreation } =
    useStorage();

  return (
    <div className="py-16 text-center">
      <DocumentIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Choose a Spreadsheet
      </h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
        Select a Google Spreadsheet to store your job applications. You can pick
        an existing one or create a new spreadsheet first in Google Drive.
      </p>

      {error && (
        <Alert
          tone="error"
          title="Could not use that spreadsheet"
          className="mx-auto mb-6 max-w-md"
        >
          {error}
        </Alert>
      )}

      <SheetCreationPrompt className="mx-auto mb-6 max-w-md" />

      {!pendingSheetCreation && (
        <Button size="lg" onClick={pickSpreadsheet} disabled={isPicking}>
          {isPicking
            ? "Opening picker..."
            : error
              ? "Try Another Spreadsheet"
              : "Select Spreadsheet"}
        </Button>
      )}
    </div>
  );
}
