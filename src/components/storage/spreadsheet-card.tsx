import { useStorage } from "../../hooks/use-storage";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";
import { DocumentIcon } from "../ui/icons";
import { SheetCreationPrompt } from "./sheet-creation-prompt";

/** Settings panel for connecting, changing, or disconnecting the spreadsheet. */
export function SpreadsheetCard() {
  const { spreadsheet, isConfigured, error, isPicking, pickSpreadsheet, clearSpreadsheet } =
    useStorage();

  return (
    <TitledCard title="Spreadsheet">
      <SheetCreationPrompt className="mb-4" />

      {error && (
        <Alert tone="error" title="Invalid spreadsheet" className="mb-4">
          {error}
        </Alert>
      )}

      {isConfigured && spreadsheet ? (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <DocumentIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium text-gray-900">{spreadsheet.name}</p>
              <p className="text-xs text-gray-400">{spreadsheet.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={pickSpreadsheet}
              disabled={isPicking}
            >
              {isPicking ? "Opening picker..." : "Change Spreadsheet"}
            </Button>
            <Button variant="danger" size="sm" onClick={clearSpreadsheet}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-gray-500">
            No spreadsheet selected. Pick one to start tracking applications.
          </p>
          <Button onClick={pickSpreadsheet} disabled={isPicking}>
            {isPicking ? "Opening picker..." : "Select Spreadsheet"}
          </Button>
        </div>
      )}
    </TitledCard>
  );
}
