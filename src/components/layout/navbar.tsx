import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { ROUTES } from "../../config/routes";
import { UserMenu } from "../auth/user-menu";
import { LoginButton } from "../auth/login-button";

const NAV_LINKS = [
  { to: ROUTES.HOME, label: "Dashboard" },
  { to: ROUTES.APPLICATIONS, label: "Applications" },
  { to: ROUTES.ANALYTICS, label: "Analytics" },
  { to: ROUTES.ADD, label: "Add" },
] as const;

export function Navbar() {
  const { state } = useAuth();
  const location = useLocation();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to={ROUTES.HOME}
            className="text-lg font-bold text-indigo-600"
          >
            JobTracker
          </Link>

          {state.isAuthenticated && (
            <div className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map(({ to, label }) => {
                const isActive =
                  to === ROUTES.HOME
                    ? location.pathname === "/"
                    : location.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-md px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {state.isAuthenticated ? <UserMenu /> : <LoginButton />}
        </div>
      </div>
    </nav>
  );
}
