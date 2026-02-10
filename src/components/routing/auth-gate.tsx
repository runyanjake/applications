import { useAuth } from "../../hooks/use-auth";
import { LoadingSpinner } from "../shared/loading-spinner";

interface AuthGateProps {
  authenticated: React.ReactNode;
  unauthenticated: React.ReactNode;
}

export function AuthGate({ authenticated, unauthenticated }: AuthGateProps) {
  const { state } = useAuth();

  if (state.isLoading) return <LoadingSpinner className="py-32" />;
  return state.isAuthenticated ? authenticated : unauthenticated;
}
