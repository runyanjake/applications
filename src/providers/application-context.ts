import { createContext } from "react";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormData,
} from "../types/application";
import type { DateBounds } from "../utils/date-range";
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
  /**
   * The filter selection, shared by every page that shows application data so
   * a period chosen on one tab still applies on the next.
   */
  filters: ApplicationFilters;
  setFilters: (filters: ApplicationFilters) => void;
  /** `applications` narrowed by `filters` — what pages should render. */
  filteredApplications: Application[];
  /** `filters`' period as concrete days, for views keyed on other dates. */
  dateBounds: DateBounds;
  getFilteredApplications: (filters: ApplicationFilters) => Application[];
}

export const ApplicationContext = createContext<ApplicationContextValue | null>(
  null,
);
