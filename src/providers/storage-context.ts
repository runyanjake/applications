import { createContext } from "react";
import type { StorageService } from "../types/storage";

export interface SpreadsheetInfo {
  id: string;
  name: string;
}

export interface StorageContextValue {
  isConfigured: boolean;
  spreadsheet: SpreadsheetInfo | null;
  storageService: StorageService;
  /** Validation failure or picker failure, ready to show to the user. */
  error: string | null;
  /** True while the Google Picker is open or the choice is being validated. */
  isPicking: boolean;
  pendingSheetCreation: SpreadsheetInfo | null;
  pickSpreadsheet: () => Promise<void>;
  clearSpreadsheet: () => void;
  confirmSheetCreation: () => Promise<void>;
  cancelSheetCreation: () => void;
}

export const StorageContext = createContext<StorageContextValue | null>(null);
