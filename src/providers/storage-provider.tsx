import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StorageService } from "../types/storage";
import type { DriveSpreadsheet } from "../services/google/drive-spreadsheets";
import { createStorageService } from "../services/storage/storage-service";
import { SpreadsheetChooser } from "../components/storage/spreadsheet-chooser";
import { useAuth } from "../hooks/use-auth";
import { sessionRemove } from "../utils/session-store";
import { describeGoogleError } from "../utils/google-error";
import { createLogger } from "../utils/logger";
import {
  StorageContext,
  type SpreadsheetInfo,
} from "./storage-context";

const log = createLogger("storage");

/** Session keys owned by ApplicationProvider — cleared when the sheet changes. */
const APP_SESSION_KEYS = ["applications", "sync-state", "filters"] as const;

const SHEET_NAME = "Applications";

/** Point the service at the spreadsheet and persist the choice. */
function commitSpreadsheet(
  service: StorageService,
  info: SpreadsheetInfo,
): void {
  service.configure({ spreadsheetId: info.id, sheetName: SHEET_NAME });
  window.electronAPI.storage.saveSpreadsheetInfo(info);
}

/** Reset the service and clear all app-related session data. */
function resetService(service: StorageService): void {
  service.configure({ spreadsheetId: "", sheetName: SHEET_NAME });
  window.electronAPI.storage.clearSpreadsheetInfo();
  APP_SESSION_KEYS.forEach(sessionRemove);
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const service = useRef(createStorageService());

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(() =>
    window.electronAPI.storage.loadSpreadsheetInfo(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pendingSheetCreation, setPendingSheetCreation] =
    useState<SpreadsheetInfo | null>(null);
  const hasPrompted = useRef(false);

  // pickSpreadsheet awaits the chooser dialog through this resolver
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const chooserResolve = useRef<((doc: DriveSpreadsheet | null) => void) | null>(
    null,
  );

  const openChooser = useCallback(
    () =>
      new Promise<DriveSpreadsheet | null>((resolve) => {
        chooserResolve.current = resolve;
        setIsChooserOpen(true);
      }),
    [],
  );

  const closeChooser = useCallback((doc: DriveSpreadsheet | null) => {
    setIsChooserOpen(false);
    chooserResolve.current?.(doc);
    chooserResolve.current = null;
  }, []);
  const cancelChooser = useCallback(() => closeChooser(null), [closeChooser]);

  // Keep the service in sync with the committed spreadsheet state
  useEffect(() => {
    if (spreadsheet) {
      service.current.configure({
        spreadsheetId: spreadsheet.id,
        sheetName: SHEET_NAME,
      });
    }
  }, [spreadsheet]);

  /** Choose, validate on a throwaway service, then commit. */
  const pickSpreadsheet = useCallback(async () => {
    setIsPicking(true);
    setError(null);
    try {
      const doc = await openChooser();
      if (!doc) return; // cancelled

      const probe = createStorageService();
      probe.configure({ spreadsheetId: doc.id, sheetName: SHEET_NAME });
      const result = await probe.validateStructure();

      if (!result.valid) {
        setError(result.error ?? "Invalid spreadsheet.");
        return;
      }
      if (result.needsSheetCreation) {
        setPendingSheetCreation({ id: doc.id, name: doc.name });
        return;
      }

      const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
      commitSpreadsheet(service.current, info);
      setSpreadsheet(info);
    } catch (err) {
      // Without this the button appears to do nothing at all.
      log.error("Spreadsheet selection failed:", err);
      setError(describeGoogleError(err));
    } finally {
      setIsPicking(false);
    }
  }, [openChooser]);

  // Open the chooser once per session on login when nothing is configured yet
  useEffect(() => {
    if (
      !authState.isAuthenticated ||
      !authState.tokens ||
      spreadsheet ||
      hasPrompted.current
    ) {
      return;
    }
    hasPrompted.current = true;
    void pickSpreadsheet();
  }, [
    authState.isAuthenticated,
    authState.tokens,
    spreadsheet,
    pickSpreadsheet,
  ]);

  const confirmSheetCreation = useCallback(async () => {
    if (!pendingSheetCreation) return;
    // Only now is it safe to point the live service at this spreadsheet
    service.current.configure({
      spreadsheetId: pendingSheetCreation.id,
      sheetName: SHEET_NAME,
    });
    try {
      await service.current.createApplicationsSheet();
    } catch (err) {
      log.error("Failed to create the Applications sheet:", err);
      setError(describeGoogleError(err));
      return;
    }
    setError(null);
    setPendingSheetCreation(null);
    window.electronAPI.storage.saveSpreadsheetInfo(pendingSheetCreation);
    setSpreadsheet(pendingSheetCreation);
  }, [pendingSheetCreation]);

  const cancelSheetCreation = useCallback(() => {
    // Live service was never reconfigured; just drop stale data if nothing was connected
    if (!spreadsheet) resetService(service.current);
    setPendingSheetCreation(null);
    setError(null);
  }, [spreadsheet]);

  const clearSpreadsheet = useCallback(() => {
    resetService(service.current);
    // Otherwise the auto-prompt effect reopens the chooser right after disconnecting
    hasPrompted.current = true;
    setSpreadsheet(null);
    setError(null);
    setPendingSheetCreation(null);
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: spreadsheet != null,
      spreadsheet,
      storageService: service.current,
      error,
      isPicking,
      pendingSheetCreation,
      pickSpreadsheet,
      clearSpreadsheet,
      confirmSheetCreation,
      cancelSheetCreation,
    }),
    [
      spreadsheet,
      error,
      isPicking,
      pendingSheetCreation,
      pickSpreadsheet,
      clearSpreadsheet,
      confirmSheetCreation,
      cancelSheetCreation,
    ],
  );

  return (
    <StorageContext.Provider value={value}>
      {children}
      {isChooserOpen && (
        <SpreadsheetChooser onSelect={closeChooser} onCancel={cancelChooser} />
      )}
    </StorageContext.Provider>
  );
}
