import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StorageService } from "../types/storage";
import { createStorageService } from "../services/storage/storage-service";
import { openSpreadsheetPicker } from "../services/picker/google-picker-service";
import { useAuth } from "../hooks/use-auth";
import { sessionClear, sessionGet, sessionSet } from "../utils/session-store";

interface SpreadsheetInfo {
  id: string;
  name: string;
}

interface StorageContextValue {
  isConfigured: boolean;
  spreadsheet: SpreadsheetInfo | null;
  storageService: StorageService;
  validationError: string | null;
  pendingSheetCreation: SpreadsheetInfo | null;
  pickSpreadsheet: () => Promise<void>;
  clearSpreadsheet: () => void;
  confirmSheetCreation: () => Promise<void>;
  cancelSheetCreation: () => void;
}

export const StorageContext = createContext<StorageContextValue | null>(null);

const SESSION_KEY = "storage:spreadsheet";

export function StorageProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const service = useRef(createStorageService());

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(
    () => sessionGet<SpreadsheetInfo>(SESSION_KEY),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingSheetCreation, setPendingSheetCreation] = useState<SpreadsheetInfo | null>(null);
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (spreadsheet) {
      service.current.configure({
        spreadsheetId: spreadsheet.id,
        sheetName: "Applications",
      });
    }
  }, [spreadsheet]);

  useEffect(() => {
    if (
      authState.isAuthenticated &&
      authState.tokens &&
      !spreadsheet &&
      !hasPrompted.current
    ) {
      hasPrompted.current = true;
      openSpreadsheetPicker(authState.tokens.accessToken).then((doc) => {
        if (doc) {
          const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
          sessionSet(SESSION_KEY, info);
          setSpreadsheet(info);
          service.current.configure({
            spreadsheetId: info.id,
            sheetName: "Applications",
          });
        }
      });
    }
  }, [authState.isAuthenticated, authState.tokens, spreadsheet]);

  const pickSpreadsheet = useCallback(async () => {
    if (!authState.tokens) return;
    const doc = await openSpreadsheetPicker(authState.tokens.accessToken);
    if (!doc) return;

    // Configure temporarily so we can validate against this spreadsheet
    service.current.configure({ spreadsheetId: doc.id, sheetName: "Applications" });
    const result = await service.current.validateStructure();

    if (!result.valid) {
      // Revert service to the previous spreadsheet (if any)
      if (spreadsheet) {
        service.current.configure({
          spreadsheetId: spreadsheet.id,
          sheetName: "Applications",
        });
      }
      setValidationError(result.error ?? "Invalid spreadsheet.");
      return;
    }

    if (result.needsSheetCreation) {
      // Hold the pick in pending state — wait for user confirmation
      setPendingSheetCreation({ id: doc.id, name: doc.name });
      return;
    }

    setValidationError(null);
    const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
    sessionSet(SESSION_KEY, info);
    setSpreadsheet(info);
  }, [authState.tokens, spreadsheet]);

  const confirmSheetCreation = useCallback(async () => {
    if (!pendingSheetCreation) return;
    await service.current.createApplicationsSheet();
    setValidationError(null);
    setPendingSheetCreation(null);
    sessionSet(SESSION_KEY, pendingSheetCreation);
    setSpreadsheet(pendingSheetCreation);
  }, [pendingSheetCreation]);

  const cancelSheetCreation = useCallback(() => {
    // Revert service config to the previously active spreadsheet (if any)
    if (spreadsheet) {
      service.current.configure({
        spreadsheetId: spreadsheet.id,
        sheetName: "Applications",
      });
    }
    setPendingSheetCreation(null);
  }, [spreadsheet]);

  const clearSpreadsheet = useCallback(() => {
    sessionClear();
    setSpreadsheet(null);
    setValidationError(null);
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: spreadsheet != null,
      spreadsheet,
      storageService: service.current,
      validationError,
      pendingSheetCreation,
      pickSpreadsheet,
      clearSpreadsheet,
      confirmSheetCreation,
      cancelSheetCreation,
    }),
    [spreadsheet, validationError, pendingSheetCreation, pickSpreadsheet, clearSpreadsheet, confirmSheetCreation, cancelSheetCreation],
  );

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
