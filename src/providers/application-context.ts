import { createContext } from "react";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormData,
} from "../types/application";
import type { ActivityEvent } from "../utils/activity";
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
  /** Shared across pages so a chosen period carries over. */
  filters: ApplicationFilters;
  setFilters: (filters: ApplicationFilters) => void;
  /*
   * Every page reads these rather than filtering `applications` itself, so all
   * views agree. The period applies to the latest status change for
   * applications and to the change date for activity.
   */
  /** `applications` narrowed by `filters`, period included. */
  filteredApplications: Application[];
  /** `applications` narrowed by every filter except the period: current state. */
  applicationsIgnoringPeriod: Application[];
  /** Status changes inside the period (new applications included), newest first. */
  activity: ActivityEvent[];
}

export const ApplicationContext = createContext<ApplicationContextValue | null>(
  null,
);
