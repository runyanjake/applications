import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { LoadingSpinner } from "../shared/loading-spinner";

export function ProtectedRoute() {
  const { state } = useAuth();

  if (state.isLoading) return <LoadingSpinner className="py-32" />;
  if (!state.isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}
