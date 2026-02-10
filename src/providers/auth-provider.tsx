import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthState, AuthTokens, AuthUser } from "../types/auth";
import { createAuthService } from "../services/auth/auth-service";
import { sessionGet, sessionRemove, sessionSet } from "../utils/session-store";

interface AuthContextValue {
  state: AuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY_USER = "auth:user";
const SESSION_KEY_TOKENS = "auth:tokens";

export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useRef(createAuthService());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AuthState>(() => {
    const user = sessionGet<AuthUser>(SESSION_KEY_USER);
    const tokens = sessionGet<AuthTokens>(SESSION_KEY_TOKENS);
    const isValid = tokens != null && tokens.expiresAt > Date.now();
    return {
      user: isValid ? user : null,
      tokens: isValid ? tokens : null,
      isAuthenticated: isValid && user != null,
      isLoading: false,
    };
  });

  const scheduleRefresh = useCallback((tokens: AuthTokens) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const msUntilExpiry = tokens.expiresAt - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 5 * 60 * 1000, 60 * 1000);
    refreshTimer.current = setTimeout(async () => {
      try {
        const newTokens = await authService.current.refreshToken();
        sessionSet(SESSION_KEY_TOKENS, newTokens);
        setState((prev) => ({
          ...prev,
          tokens: newTokens,
        }));
        scheduleRefresh(newTokens);
      } catch {
        setState({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
        sessionRemove(SESSION_KEY_USER);
        sessionRemove(SESSION_KEY_TOKENS);
      }
    }, refreshIn);
  }, []);

  useEffect(() => {
    if (state.tokens && state.isAuthenticated) {
      scheduleRefresh(state.tokens);
    }
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
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    try {
      await authService.current.logout();
    } finally {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      sessionRemove(SESSION_KEY_USER);
      sessionRemove(SESSION_KEY_TOKENS);
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const value = useMemo(
    () => ({ state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
