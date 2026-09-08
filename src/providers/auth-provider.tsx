import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthState, AuthTokens, AuthUser } from "../types/auth";
import { createAuthService } from "../services/auth/auth-service";
import { setGapiAccessToken } from "../services/auth/gapi-token";
import { sessionGet, sessionRemove, sessionSet } from "../utils/session-store";
import { createLogger } from "../utils/logger";
import { setLogUser } from "../utils/log-transport";
import { AuthContext } from "./auth-context";

const log = createLogger("auth");

const SESSION_KEY_USER = "auth:user";
const SESSION_KEY_TOKENS = "auth:tokens";

/** Refresh this long before expiry, but never sooner than a minute from now. */
const REFRESH_LEAD_MS = 5 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 60 * 1000;

const SIGNED_OUT: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
};

/** Restore a session, ignoring tokens too close to expiry to be usable. */
function restoreSession(): AuthState {
  const user = sessionGet<AuthUser>(SESSION_KEY_USER);
  const tokens = sessionGet<AuthTokens>(SESSION_KEY_TOKENS);
  const isValid = tokens != null && tokens.expiresAt - Date.now() > MIN_REFRESH_DELAY_MS;
  if (!isValid || user == null) return SIGNED_OUT;
  return { user, tokens, isAuthenticated: true, isLoading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useRef(createAuthService());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AuthState>(restoreSession);

  // Tag log events with the opaque Google account id (never the email)
  useEffect(() => {
    setLogUser(state.user?.id ?? null);
  }, [state.user?.id]);

  const signOutLocally = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setLogUser(null);
    sessionRemove(SESSION_KEY_USER);
    sessionRemove(SESSION_KEY_TOKENS);
    setGapiAccessToken(null);
    setState(SIGNED_OUT);
  }, []);

  const scheduleRefresh = useCallback(
    (tokens: AuthTokens) => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const refreshIn = Math.max(
        tokens.expiresAt - Date.now() - REFRESH_LEAD_MS,
        MIN_REFRESH_DELAY_MS,
      );
      refreshTimer.current = setTimeout(async () => {
        try {
          const newTokens = await authService.current.refreshToken();
          sessionSet(SESSION_KEY_TOKENS, newTokens);
          setState((prev) => ({ ...prev, tokens: newTokens }));
          scheduleRefresh(newTokens);
        } catch (err) {
          log.error("Token refresh failed, signing out:", err);
          signOutLocally();
        }
      }, refreshIn);
    },
    [signOutLocally],
  );

  useEffect(() => {
    if (!state.tokens || !state.isAuthenticated) return;
    setGapiAccessToken(state.tokens.accessToken);
    scheduleRefresh(state.tokens);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [state.tokens, state.isAuthenticated, scheduleRefresh]);

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await authService.current.login();
      sessionSet(SESSION_KEY_USER, result.user);
      sessionSet(SESSION_KEY_TOKENS, result.tokens);
      setState({
        user: result.user,
        tokens: result.tokens,
        isAuthenticated: true,
        isLoading: false,
      });
      scheduleRefresh(result.tokens);
      log.audit("auth.signed_in");
    } catch (err) {
      log.error("Login failed:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      await authService.current.logout();
    } catch (err) {
      log.warn("Token revocation failed; clearing the local session anyway:", err);
    } finally {
      log.audit("auth.signed_out");
      signOutLocally();
    }
  }, [signOutLocally]);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
