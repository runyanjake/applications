import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { ROUTES } from "../../config/routes";
import { GoogleIcon } from "../ui/icons";

export function LoginButton({ className = "" }: { className?: string }) {
  const { login, state } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login();
    navigate(ROUTES.HOME);
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={state.isLoading}
      className={`inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 ${className}`}
    >
      {state.isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      {state.isLoading ? "Signing in..." : "Sign in with Google"}
    </button>
  );
}
