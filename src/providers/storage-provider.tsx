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

interface SpreadsheetInfo {
  id: string;
  name: string;
}

interface StorageContextValue {
  isConfigured: boolean;
  spreadsheet: SpreadsheetInfo | null;
  storageService: StorageService;
  pickSpreadsheet: () => Promise<void>;
  clearSpreadsheet: () => void;
}

export const StorageContext = createContext<StorageContextValue | null>(null);

const SESSION_KEY = "storage:spreadsheet";

export function StorageProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const service = useRef(createStorageService());

  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetInfo | null>(
    () => sessionGet<SpreadsheetInfo>(SESSION_KEY),
  );
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
    if (doc) {
      const info: SpreadsheetInfo = { id: doc.id, name: doc.name };
      sessionSet(SESSION_KEY, info);
      setSpreadsheet(info);
      service.current.configure({
        spreadsheetId: info.id,
        sheetName: "Applications",
      });
    }
  }, [authState.tokens]);

  const clearSpreadsheet = useCallback(() => {
    sessionRemove(SESSION_KEY);
    setSpreadsheet(null);
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: spreadsheet != null,
      spreadsheet,
      storageService: service.current,
      pickSpreadsheet,
      clearSpreadsheet,
    }),
    [spreadsheet, pickSpreadsheet, clearSpreadsheet],
  );

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
}
