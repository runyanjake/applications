import { useStorage } from "../../hooks/use-storage";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";

/**
 * Consent step shown when the chosen spreadsheet has no "Applications" sheet.
 * Rendered by both the first-run setup screen and the settings card.
 */
export function SheetCreationPrompt({ className = "" }: { className?: string }) {
  const { pendingSheetCreation, confirmSheetCreation, cancelSheetCreation } =
    useStorage();

  if (!pendingSheetCreation) return null;

  return (
    <Alert
      tone="warning"
      title='No "Applications" sheet found'
      className={className}
      actions={
        <>
          <Button variant="warning" size="sm" onClick={confirmSheetCreation}>
            Create Sheet &amp; Continue
          </Button>
          <Button variant="secondary" size="sm" onClick={cancelSheetCreation}>
            Cancel
          </Button>
        </>
      }
    >
      <p>
        <span className="font-medium">{pendingSheetCreation.name}</span> doesn't
        have an "Applications" sheet. PWS Applications will create one for you.
        Any existing sheets in this file will not be affected.
      </p>
    </Alert>
  );
}
