import { createContext } from "react";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormData,
} from "../types/application";
import type { SyncState } from "../utils/sync";

export interface ApplicationContextValue {
  applications: Application[];
  isLoading: boolean;
  /** Why the initial load from the spreadsheet failed, if it did. */
  loadError: string | null;
  syncState: SyncState;
  addApplication: (data: ApplicationFormData) => void;
  updateApplication: (id: string, data: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  sync: () => Promise<void>;
  forceOverwrite: () => Promise<void>;
  reloadFromRemote: () => Promise<void>;
  getFilteredApplications: (filters: ApplicationFilters) => Application[];
}

export const ApplicationContext = createContext<ApplicationContextValue | null>(
  null,
);
