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
import { sessionGet, sessionRemove, sessionSet } from "../utils/session-store";

// Session keys owned by ApplicationProvider — cleared whenever the spreadsheet changes or disconnects
const APP_SESSION_KEYS = ["applications", "sync-state"] as const;

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

/** Configure the service and persist the spreadsheet info to session. */
function commitSpreadsheet(
  service: StorageService,
  info: SpreadsheetInfo,
): void {
  service.configure({ spreadsheetId: info.id, sheetName: "Applications" });
  sessionSet(SESSION_KEY, info);
}

/** Reset the service and clear all app-related session data. */
function resetService(service: StorageService): void {
  service.configure({ spreadsheetId: "", sheetName: "Applications" });
  sessionRemove(SESSION_KEY);
  APP_SESSION_KEYS.forEach(sessionRemove);
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const service = useRef(createStorageService());

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(
    () => sessionGet<SpreadsheetInfo>(SESSION_KEY),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingSheetCreation, setPendingSheetCreation] = useState<SpreadsheetInfo | null>(null);
  const hasPrompted = useRef(false);

  // Keep main service in sync with committed spreadsheet state
  useEffect(() => {
    if (spreadsheet) {
      service.current.configure({
        spreadsheetId: spreadsheet.id,
        sheetName: "Applications",
      });
    }
  }, [spreadsheet]);

  // Auto-open picker once on login when no spreadsheet is configured
  useEffect(() => {
    if (
      authState.isAuthenticated &&
      authState.tokens &&
      !spreadsheet &&
      !hasPrompted.current
    ) {
      hasPrompted.current = true;
      openSpreadsheetPicker(authState.tokens.accessToken).then(async (doc) => {
        if (!doc) {
          hasPrompted.current = false;
          return;
        }
        // Validate using a temp service so main service is untouched until committed
        const temp = createStorageService();
        temp.configure({ spreadsheetId: doc.id, sheetName: "Applications" });
        const result = await temp.validateStructure();

        if (!result.valid) {
          setValidationError(result.error ?? "Invalid spreadsheet.");
          return;
        }
        if (result.needsSheetCreation) {
          setPendingSheetCreation({ id: doc.id, name: doc.name });
          return;
        }

        const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
        commitSpreadsheet(service.current, info);
        setSpreadsheet(info);
      });
    }
  }, [authState.isAuthenticated, authState.tokens, spreadsheet]);

  const pickSpreadsheet = useCallback(async () => {
    if (!authState.tokens) return;
    const doc = await openSpreadsheetPicker(authState.tokens.accessToken);
    if (!doc) return;

    // Validate with a temporary service — main service is never touched until we commit
    const temp = createStorageService();
    temp.configure({ spreadsheetId: doc.id, sheetName: "Applications" });
    const result = await temp.validateStructure();

    if (!result.valid) {
      setValidationError(result.error ?? "Invalid spreadsheet.");
      return;
    }

    if (result.needsSheetCreation) {
      setValidationError(null);
      setPendingSheetCreation({ id: doc.id, name: doc.name });
      return;
    }

    // Valid — commit and trigger reload in ApplicationProvider
    setValidationError(null);
    const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
    commitSpreadsheet(service.current, info);
    setSpreadsheet(info);
  }, [authState.tokens]);

  const confirmSheetCreation = useCallback(async () => {
    if (!pendingSheetCreation) return;
    // Now it is safe to configure the main service and create the sheet
    service.current.configure({
      spreadsheetId: pendingSheetCreation.id,
      sheetName: "Applications",
    });
    await service.current.createApplicationsSheet();
    setValidationError(null);
    setPendingSheetCreation(null);
    sessionSet(SESSION_KEY, pendingSheetCreation);
    setSpreadsheet(pendingSheetCreation);
  }, [pendingSheetCreation]);

  const cancelSheetCreation = useCallback(() => {
    // Main service was never reconfigured, so nothing to revert there.
    // If there was no previous spreadsheet, clear any stale app session data.
    if (!spreadsheet) {
      resetService(service.current);
    }
    setPendingSheetCreation(null);
    setValidationError(null);
  }, [spreadsheet]);

  const clearSpreadsheet = useCallback(() => {
    resetService(service.current);
    setSpreadsheet(null);
    setValidationError(null);
    setPendingSheetCreation(null);
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
    [
      spreadsheet,
      validationError,
      pendingSheetCreation,
      pickSpreadsheet,
      clearSpreadsheet,
      confirmSheetCreation,
      cancelSheetCreation,
    ],
  );

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
