import {
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
import { describeGoogleError } from "../utils/google-error";
import { createLogger } from "../utils/logger";
import {
  StorageContext,
  type SpreadsheetInfo,
} from "./storage-context";

const log = createLogger("storage");

/** Session keys owned by ApplicationProvider — cleared when the sheet changes. */
const APP_SESSION_KEYS = ["applications", "sync-state", "filters"] as const;

const SESSION_KEY = "storage:spreadsheet";
const SHEET_NAME = "Applications";

/** Configure the service and persist the spreadsheet info to session. */
function commitSpreadsheet(
  service: StorageService,
  info: SpreadsheetInfo,
): void {
  service.configure({ spreadsheetId: info.id, sheetName: SHEET_NAME });
  sessionSet(SESSION_KEY, info);
}

/** Reset the service and clear all app-related session data. */
function resetService(service: StorageService): void {
  service.configure({ spreadsheetId: "", sheetName: SHEET_NAME });
  sessionRemove(SESSION_KEY);
  APP_SESSION_KEYS.forEach(sessionRemove);
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const service = useRef(createStorageService());

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(() =>
    sessionGet<SpreadsheetInfo>(SESSION_KEY),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [pendingSheetCreation, setPendingSheetCreation] =
    useState<SpreadsheetInfo | null>(null);
  const hasPrompted = useRef(false);

  // Keep the service in sync with the committed spreadsheet state
  useEffect(() => {
    if (spreadsheet) {
      service.current.configure({
        spreadsheetId: spreadsheet.id,
        sheetName: SHEET_NAME,
      });
    }
  }, [spreadsheet]);

  /**
   * The single spreadsheet-selection flow: open the picker, validate the
   * choice against a throwaway service (so the live one is untouched until
   * the choice is known-good), then commit.
   */
  const pickSpreadsheet = useCallback(async () => {
    const accessToken = authState.tokens?.accessToken;
    if (!accessToken) {
      setError("You are signed out. Sign in again to choose a spreadsheet.");
      return;
    }

    setIsPicking(true);
    setError(null);
    try {
      const doc = await openSpreadsheetPicker(accessToken);
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
  }, [authState.tokens?.accessToken]);

  // Open the picker once per session on login when nothing is configured yet
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
    sessionSet(SESSION_KEY, pendingSheetCreation);
    setSpreadsheet(pendingSheetCreation);
  }, [pendingSheetCreation]);

  const cancelSheetCreation = useCallback(() => {
    // The live service was never reconfigured, so there is nothing to revert.
    // With no previous spreadsheet, drop any stale app session data.
    if (!spreadsheet) resetService(service.current);
    setPendingSheetCreation(null);
    setError(null);
  }, [spreadsheet]);

  const clearSpreadsheet = useCallback(() => {
    resetService(service.current);
    // Disconnecting must not reopen the picker. Marking the prompt as spent is
    // what makes that true: the auto-prompt effect only sets this ref when it
    // actually fires, so a session that started with a spreadsheet already in
    // storage still has it false. Without this line, clearing the spreadsheet
    // satisfies every condition in that effect and drops the picker's modal
    // backdrop over the page — which reads as a white, unclickable screen.
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
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
