export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
