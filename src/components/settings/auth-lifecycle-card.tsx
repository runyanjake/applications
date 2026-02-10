import { useAuth } from "../../hooks/use-auth";

export function AuthLifecycleCard() {
  const { login, logout } = useAuth();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Authentication
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Manage your Google account connection. Re-authenticating will refresh
        your access token. Signing out will clear all session data.
      </p>
      <div className="flex gap-2">
        <button
          onClick={login}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Re-authenticate
        </button>
        <button
          onClick={logout}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
