import {
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
import { useAuth } from "../hooks/use-auth";
import { setGoogleAccessToken } from "../services/auth/access-token";
import { sessionGet, sessionRemove, sessionSet } from "../utils/session-store";
import { describeGoogleError, isAuthError } from "../utils/google-error";
import { createLogger } from "../utils/logger";
import { matchesFilters } from "../utils/filter-applications";
import { resolveDateBounds } from "../utils/date-range";
import { collectActivity } from "../utils/activity";
import {
  computeVersion,
  shouldAutoSync,
  INITIAL_SYNC_STATE,
  type SyncState,
} from "../utils/sync";
import { ApplicationContext } from "./application-context";

const log = createLogger("sync");
/** Audit trail for changes to application records. */
const audit = createLogger("applications");

const SESSION_KEY = "applications";
/** Spreadsheet the cached applications belong to. */
const SESSION_SHEET_KEY = "applications-sheet";
const SYNC_STATE_KEY = "sync-state";
const FILTERS_KEY = "filters";

/** Names of the fields an update actually changes, for the audit trail. */
function changedFields(
  previous: Application,
  patch: Partial<Application>,
): string[] {
  return (Object.keys(patch) as (keyof Application)[]).filter(
    (key) => key !== "history" && patch[key] !== previous[key],
  );
}

/** Turn any storage failure into something worth showing the user. */
function describeLoadFailure(err: unknown): string {
  const message = describeGoogleError(err);
  return isAuthError(err)
    ? `${message} — try re-authenticating from Settings.`
    : message;
}

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const { storageService, isConfigured, spreadsheet } = useStorage();
  const { state: authState } = useAuth();
  const accessToken = authState.tokens?.accessToken ?? null;

  const [applications, setApplications] = useState<Application[]>(
    () => sessionGet<Application[]>(SESSION_KEY) ?? [],
  );
  // Persisted so a reload doesn't reset the period to All Time
  const [filters, setFiltersState] = useState<ApplicationFilters>(
    () => sessionGet<ApplicationFilters>(FILTERS_KEY) ?? { datePreset: "all" },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(
    () => sessionGet<SyncState>(SYNC_STATE_KEY) ?? INITIAL_SYNC_STATE,
  );

  const appsRef = useRef(applications);
  const syncRef = useRef(syncState);
  const isLoadingRef = useRef(false);
  /** Spreadsheet id whose contents are already loaded, so we load once each. */
  const loadedIdRef = useRef<string | null>(null);

  const sheetIdRef = useRef<string | null>(null);
  appsRef.current = applications;
  sheetIdRef.current = spreadsheet?.id ?? null;
  syncRef.current = syncState;
  isLoadingRef.current = isLoading;

  const persistLocal = useCallback(
    (apps: Application[], markDirty: boolean) => {
      setApplications(apps);
      sessionSet(SESSION_KEY, apps);
      sessionSet(SESSION_SHEET_KEY, sheetIdRef.current);
      if (!markDirty) return;
      setSyncState((prev) => {
        const next: SyncState = {
          ...prev,
          isDirty: true,
          pendingChanges: prev.pendingChanges + 1,
          status: "pending",
          error: null,
        };
        sessionSet(SYNC_STATE_KEY, next);
        return next;
      });
    },
    [],
  );

  const markSynced = useCallback((apps: Application[]) => {
    const next: SyncState = {
      lastSyncedAt: Date.now(),
      isDirty: false,
      pendingChanges: 0,
      status: "synced",
      remoteVersion: computeVersion(apps),
      error: null,
    };
    setSyncState(next);
    sessionSet(SYNC_STATE_KEY, next);
  }, []);

  const setSyncFailure = useCallback((status: SyncState["status"], error: string) => {
    const next: SyncState = { ...syncRef.current, status, error };
    setSyncState(next);
    sessionSet(SYNC_STATE_KEY, next);
  }, []);

  /** Pull the sheet into local state, replacing whatever is there. */
  const loadFromRemote = useCallback(async () => {
    if (!isConfigured) return;
    setIsLoading(true);
    isLoadingRef.current = true;
    setLoadError(null);
    try {
      // Effects run child-first; AuthProvider may not have set the token yet
      setGoogleAccessToken(accessToken);
      const apps = await storageService.getAll();
      setApplications(apps);
      sessionSet(SESSION_KEY, apps);
      sessionSet(SESSION_SHEET_KEY, spreadsheet?.id ?? null);
      markSynced(apps);
      loadedIdRef.current = spreadsheet?.id ?? null;
      audit.audit("applications.loaded", {
        count: apps.length,
        spreadsheetId: spreadsheet?.id,
      });
    } catch (err) {
      // Leave loadedIdRef unset so a later token or retry re-attempts the load
      log.error("Load from spreadsheet failed:", err);
      setLoadError(describeLoadFailure(err));
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [isConfigured, storageService, accessToken, spreadsheet?.id, markSynced]);

  /** Push local state to the sheet, refusing to clobber remote edits. */
  const sync = useCallback(async () => {
    if (!isConfigured) return;
    if (isLoadingRef.current) return; // never write over an in-flight load
    setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));
    sessionSet(SYNC_STATE_KEY, { ...syncRef.current, status: "syncing" });

    try {
      const remoteApps = await storageService.getAll();
      const remoteVersion = computeVersion(remoteApps);

      if (
        syncRef.current.remoteVersion !== null &&
        remoteVersion !== syncRef.current.remoteVersion
      ) {
        log.warn("Conflict — the sheet changed since the last sync");
        setSyncFailure(
          "conflict",
          "Remote spreadsheet was modified since your last sync. Overwrite remote or reload from remote?",
        );
        return;
      }

      await storageService.writeAll(appsRef.current);
      markSynced(appsRef.current);
      audit.audit("applications.synced", { count: appsRef.current.length });
    } catch (err) {
      log.error("Sync to remote failed:", err);
      setSyncFailure("error", describeLoadFailure(err));
    }
  }, [isConfigured, storageService, markSynced, setSyncFailure]);

  /** Resolve a conflict by pushing local state over the remote. */
  const forceOverwrite = useCallback(async () => {
    if (!isConfigured) return;
    setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));
    try {
      await storageService.writeAll(appsRef.current);
      markSynced(appsRef.current);
      audit.audit("applications.overwritten", {
        count: appsRef.current.length,
      });
    } catch (err) {
      log.error("Force overwrite failed:", err);
      setSyncFailure("error", describeLoadFailure(err));
    }
  }, [isConfigured, storageService, markSynced, setSyncFailure]);

  // Load on spreadsheet change (retrying once authed); keyed on id so token refreshes keep local edits
  useEffect(() => {
    if (!isConfigured || !spreadsheet) {
      loadedIdRef.current = null;
      setApplications([]);
      setLoadError(null);
      sessionRemove(SESSION_KEY);
      sessionRemove(SESSION_SHEET_KEY);
      setSyncState(INITIAL_SYNC_STATE);
      sessionRemove(SYNC_STATE_KEY);
      // Filters belong to the previous spreadsheet
      setFiltersState({ datePreset: "all" });
      sessionRemove(FILTERS_KEY);
      return;
    }
    if (!accessToken) return; // not signed in yet — this effect re-runs when it is
    if (loadedIdRef.current === spreadsheet.id) return;
    // A window reload (including dev hot reload) must not replace unsynced edits:
    // keep them and push, which still refuses to clobber a changed sheet
    if (
      syncRef.current.isDirty &&
      sessionGet<string>(SESSION_SHEET_KEY) === spreadsheet.id
    ) {
      loadedIdRef.current = spreadsheet.id;
      log.info("Kept unsynced local changes across reload; syncing");
      setGoogleAccessToken(accessToken);
      void sync();
      return;
    }
    void loadFromRemote();
  }, [isConfigured, spreadsheet, accessToken, loadFromRemote, sync]);

  const maybeAutoSync = useCallback(() => {
    if (shouldAutoSync(syncRef.current)) void sync();
  }, [sync]);

  const addApplication = useCallback(
    (data: ApplicationFormData) => {
      const now = new Date().toISOString();
      const app: Application = {
        ...data,
        id: crypto.randomUUID(),
        lastUpdated: now,
        history: [{ ts: now, from: null, to: data.status }],
      };
      persistLocal([app, ...appsRef.current], true);
      audit.audit("application.created", {
        id: app.id,
        company: app.companyName,
        position: app.position,
        status: app.status,
        interest: app.interest,
      });
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  const updateApplication = useCallback(
    (id: string, data: Partial<Application>) => {
      const now = new Date().toISOString();
      const previous = appsRef.current.find((app) => app.id === id);
      if (!previous) {
        log.warn("Ignoring update for unknown application", id);
        return;
      }

      const statusChanged =
        data.status !== undefined && data.status !== previous.status;
      const history = statusChanged
        ? [...previous.history, { ts: now, from: previous.status, to: data.status! }]
        : previous.history;
      const updated = appsRef.current.map((app) =>
        app.id === id ? { ...app, ...data, lastUpdated: now, history } : app,
      );

      persistLocal(updated, true);
      audit.audit("application.updated", {
        id,
        company: previous.companyName,
        position: previous.position,
        // Field names only — values may be free text the user typed
        fields: changedFields(previous, data).join(",") || "none",
        ...(statusChanged && {
          fromStatus: previous.status,
          toStatus: data.status,
        }),
      });
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  const deleteApplication = useCallback(
    (id: string) => {
      const removed = appsRef.current.find((app) => app.id === id);
      persistLocal(
        appsRef.current.filter((app) => app.id !== id),
        true,
      );
      audit.audit("application.deleted", {
        id,
        company: removed?.companyName,
        position: removed?.position,
        status: removed?.status,
      });
      maybeAutoSync();
    },
    [persistLocal, maybeAutoSync],
  );

  // Best-effort save of unsynced work when the window closes
  useEffect(() => {
    const handler = () => {
      if (!syncRef.current.isDirty || !isConfigured) return;
      storageService.writeAll(appsRef.current).catch((err: unknown) => {
        log.error("Best-effort sync on unload failed:", err);
      });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isConfigured, storageService]);

  const setFilters = useCallback((next: ApplicationFilters) => {
    setFiltersState(next);
    sessionSet(FILTERS_KEY, next);
  }, []);

  const dateBounds = useMemo(() => resolveDateBounds(filters), [filters]);

  const filteredApplications = useMemo(
    () => applications.filter((app) => matchesFilters(app, filters, dateBounds)),
    [applications, filters, dateBounds],
  );

  const applicationsIgnoringPeriod = useMemo(
    () => applications.filter((app) => matchesFilters(app, filters, {})),
    [applications, filters],
  );

  // Old applications can still move this period, so activity starts from the unperioded set
  const activity = useMemo(
    () => collectActivity(applicationsIgnoringPeriod, dateBounds),
    [applicationsIgnoringPeriod, dateBounds],
  );

  const value = useMemo(
    () => ({
      applications,
      isLoading,
      loadError,
      syncState,
      addApplication,
      updateApplication,
      deleteApplication,
      sync,
      forceOverwrite,
      reloadFromRemote: loadFromRemote,
      filters,
      setFilters,
      filteredApplications,
      applicationsIgnoringPeriod,
      activity,
    }),
    [
      applications,
      isLoading,
      loadError,
      syncState,
      addApplication,
      updateApplication,
      deleteApplication,
      sync,
      forceOverwrite,
      loadFromRemote,
      filters,
      setFilters,
      filteredApplications,
      applicationsIgnoringPeriod,
      activity,
    ],
  );

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}
