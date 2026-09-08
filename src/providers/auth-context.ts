import { createContext } from "react";
import type { AuthState } from "../types/auth";

export interface AuthContextValue {
  state: AuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
