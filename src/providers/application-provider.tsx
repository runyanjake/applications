import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormData,
} from "../types/application";
import { useStorage } from "../hooks/use-storage";
import { sessionGet, sessionSet } from "../utils/session-store";

interface ApplicationContextValue {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  addApplication: (data: ApplicationFormData) => Promise<void>;
  updateApplication: (
    id: string,
    data: Partial<Application>,
  ) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  refreshFromSheet: () => Promise<void>;
  getFilteredApplications: (filters: ApplicationFilters) => Application[];
}

export const ApplicationContext =
  createContext<ApplicationContextValue | null>(null);

const SESSION_KEY = "applications";

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { storageService, isConfigured } = useStorage();
  const [applications, setApplications] = useState<Application[]>(
    () => sessionGet<Application[]>(SESSION_KEY) ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((apps: Application[]) => {
    setApplications(apps);
    sessionSet(SESSION_KEY, apps);
  }, []);

  const refreshFromSheet = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    setError(null);
    try {
      const apps = await storageService.getAll();
      persist(apps);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load applications",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, storageService, persist]);

  useEffect(() => {
    if (isConfigured && applications.length === 0) {
      refreshFromSheet();
    }
  }, [isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  const addApplication = useCallback(
    async (data: ApplicationFormData) => {
      const app = await storageService.create(data);
      persist([app, ...applications]);
    },
    [storageService, applications, persist],
  );

  const updateApplication = useCallback(
    async (id: string, data: Partial<Application>) => {
      const updated = await storageService.update(id, data);
      persist(
        applications.map((a) => (a.id === id ? updated : a)),
      );
    },
    [storageService, applications, persist],
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      await storageService.delete(id);
      persist(applications.filter((a) => a.id !== id));
    },
    [storageService, applications, persist],
  );

  const getFilteredApplications = useCallback(
    (filters: ApplicationFilters) => {
      return applications.filter((app) => {
        if (
          filters.status?.length &&
          !filters.status.includes(app.status)
        )
          return false;
        if (
          filters.interest?.length &&
          !filters.interest.includes(app.interest)
        )
          return false;
        if (
          filters.companyName &&
          !app.companyName
            .toLowerCase()
            .includes(filters.companyName.toLowerCase())
        )
          return false;
        if (filters.remote != null && app.remote !== filters.remote)
          return false;
        if (filters.dateRange) {
          if (
            filters.dateRange.from &&
            app.dateApplied < filters.dateRange.from
          )
            return false;
          if (
            filters.dateRange.to &&
            app.dateApplied > filters.dateRange.to
          )
            return false;
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          return (
            app.position.toLowerCase().includes(q) ||
            app.companyName.toLowerCase().includes(q) ||
            app.notes.toLowerCase().includes(q)
          );
        }
        return true;
      });
    },
    [applications],
  );

  const value = useMemo(
    () => ({
      applications,
      isLoading,
      error,
      addApplication,
      updateApplication,
      deleteApplication,
      refreshFromSheet,
      getFilteredApplications,
    }),
    [
      applications,
      isLoading,
      error,
      addApplication,
      updateApplication,
      deleteApplication,
      refreshFromSheet,
      getFilteredApplications,
    ],
  );

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}
