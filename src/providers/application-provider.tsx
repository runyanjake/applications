import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Application,
  ApplicationFilters,
  ApplicationFormData,
} from "../types/application";
import { useStorage } from "../hooks/use-storage";
import { generateId } from "../utils/id";
import { sessionGet, sessionSet } from "../utils/session-store";
import {
  computeVersion,
  shouldAutoSync,
  INITIAL_SYNC_STATE,
  type SyncState,
} from "../utils/sync";

interface ApplicationContextValue {
  applications: Application[];
  isLoading: boolean;
  syncState: SyncState;
  addApplication: (data: ApplicationFormData) => void;
  updateApplication: (id: string, data: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  sync: () => Promise<void>;
  forceOverwrite: () => Promise<void>;
  reloadFromRemote: () => Promise<void>;
  getFilteredApplications: (filters: ApplicationFilters) => Application[];
}

export const ApplicationContext =
  createContext<ApplicationContextValue | null>(null);

const SESSION_KEY = "applications";
const SYNC_STATE_KEY = "sync-state";

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { storageService, isConfigured } = useStorage();
  const [applications, setApplications] = useState<Application[]>(
    () => sessionGet<Application[]>(SESSION_KEY) ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(
    () => sessionGet<SyncState>(SYNC_STATE_KEY) ?? INITIAL_SYNC_STATE,
  );
  const appsRef = useRef(applications);
  const syncRef = useRef(syncState);

  appsRef.current = applications;
  syncRef.current = syncState;

  const persistLocal = useCallback(
    (apps: Application[], markDirty: boolean) => {
      setApplications(apps);
      sessionSet(SESSION_KEY, apps);
      if (markDirty) {
        setSyncState((prev) => {
          const next = {
            ...prev,
            isDirty: true,
            pendingChanges: prev.pendingChanges + 1,
            status: "pending" as const,
            error: null,
          };
          sessionSet(SYNC_STATE_KEY, next);
          return next;
        });
      }
    },
    [],
  );

  const markSynced = useCallback((apps: Application[]) => {
    const version = computeVersion(apps);
    const next: SyncState = {
      lastSyncedAt: Date.now(),
      isDirty: false,
      pendingChanges: 0,
      status: "synced",
      remoteVersion: version,
      error: null,
    };
    setSyncState(next);
    sessionSet(SYNC_STATE_KEY, next);
  }, []);

  // Initial load from sheet
  useEffect(() => {
    if (!isConfigured) return;
    const cached = sessionGet<Application[]>(SESSION_KEY);
    if (cached && cached.length > 0) return;
    setIsLoading(true);
    storageService.getAll().then(
      (apps) => {
        setApplications(apps);
        sessionSet(SESSION_KEY, apps);
        markSynced(apps);
        setIsLoading(false);
      },
      (err) => {
        console.error("[sync] Initial load from sheet failed:", err);
        setIsLoading(false);
      },
    );
  }, [isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync: read remote version, compare, write if safe
  const sync = useCallback(async () => {
    if (!isConfigured) return;
    setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));
    sessionSet(SYNC_STATE_KEY, { ...syncRef.current, status: "syncing" });

    try {
      const remoteApps = await storageService.getAll();
      const remoteVersion = computeVersion(remoteApps);

      if (
        syncRef.current.remoteVersion !== null &&
        remoteVersion !== syncRef.current.remoteVersion
      ) {
        console.error("[sync] Conflict detected — remote version changed since last sync");
        const next: SyncState = {
          ...syncRef.current,
          status: "conflict",
          error:
            "Remote spreadsheet was modified since your last sync. Overwrite remote or reload from remote?",
        };
        setSyncState(next);
        sessionSet(SYNC_STATE_KEY, next);
        return;
      }

      await storageService.writeAll(appsRef.current);
      markSynced(appsRef.current);
    } catch (err) {
      console.error("[sync] Sync to remote failed:", err);
      const msg =
        err instanceof Error ? err.message : "Sync failed";
      const next: SyncState = {
        ...syncRef.current,
        status: "error",
        error: msg,
      };
      setSyncState(next);
      sessionSet(SYNC_STATE_KEY, next);
    }
  }, [isConfigured, storageService, markSynced]);

  // Force overwrite remote (resolve conflict by pushing local)
  const forceOverwrite = useCallback(async () => {
    if (!isConfigured) return;
    setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      await storageService.writeAll(appsRef.current);
      markSynced(appsRef.current);
    } catch (err) {
      console.error("[sync] Force overwrite failed:", err);
      const msg =
        err instanceof Error ? err.message : "Sync failed";
      setSyncState((prev) => ({ ...prev, status: "error", error: msg }));
    }
  }, [isConfigured, storageService, markSynced]);

  // Reload from remote (resolve conflict by pulling remote)
  const reloadFromRemote = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    try {
      const apps = await storageService.getAll();
      setApplications(apps);
      sessionSet(SESSION_KEY, apps);
      markSynced(apps);
    } catch (err) {
      console.error("[sync] Reload from remote failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, storageService, markSynced]);

  // Auto-sync check after local mutations
  const maybeAutoSync = useCallback(() => {
    if (shouldAutoSync(syncRef.current)) {
      sync();
    }
  }, [sync]);

  // Local-only CRUD
  const addApplication = useCallback(
    (data: ApplicationFormData) => {
      const app: Application = {
        ...data,
        id: generateId(),
        lastUpdated: new Date().toISOString(),
      };
      persistLocal([app, ...appsRef.current], true);
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  const updateApplication = useCallback(
    (id: string, data: Partial<Application>) => {
      const updated = appsRef.current.map((a) =>
        a.id === id
          ? { ...a, ...data, lastUpdated: new Date().toISOString() }
          : a,
      );
      persistLocal(updated, true);
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  const deleteApplication = useCallback(
    (id: string) => {
      persistLocal(
        appsRef.current.filter((a) => a.id !== id),
        true,
      );
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  // Best-effort sync on page unload
  useEffect(() => {
    const handler = () => {
      if (syncRef.current.isDirty && isConfigured) {
        storageService.writeAll(appsRef.current).catch((err) => {
          console.error("[sync] Best-effort sync on unload failed:", err);
        });
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isConfigured, storageService]);

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
      syncState,
      addApplication,
      updateApplication,
      deleteApplication,
      sync,
      forceOverwrite,
      reloadFromRemote,
      getFilteredApplications,
    }),
    [
      applications,
      isLoading,
      syncState,
      addApplication,
      updateApplication,
      deleteApplication,
      sync,
      forceOverwrite,
      reloadFromRemote,
      getFilteredApplications,
    ],
  );

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}
