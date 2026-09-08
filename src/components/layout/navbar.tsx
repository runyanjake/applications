import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/use-auth";
import { useStorage } from "../../hooks/use-storage";
import { ROUTES } from "../../config/routes";
import { UserMenu } from "../auth/user-menu";
import { LoginButton } from "../auth/login-button";
import { SyncIndicator } from "../sync/sync-indicator";

/** `needsData` links are gated on a spreadsheet and would bounce home without one. */
const NAV_LINKS = [
  { to: ROUTES.HOME, label: "Dashboard", needsData: false },
  { to: ROUTES.APPLICATIONS, label: "Applications", needsData: true },
  { to: ROUTES.ANALYTICS, label: "Analytics", needsData: true },
  { to: ROUTES.ADD, label: "Add", needsData: true },
  { to: ROUTES.REPORT, label: "Report", needsData: true },
] as const;

export function Navbar() {
  const { state } = useAuth();
  const { isConfigured } = useStorage();
  const location = useLocation();

  const links = NAV_LINKS.filter((link) => isConfigured || !link.needsData);

  return (
    <nav className="border-b border-gray-200 bg-white print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to={ROUTES.HOME}
            className="text-lg font-bold text-indigo-600"
          >
            PWS Applications
          </Link>

          {state.isAuthenticated && (
            <div className="hidden items-center gap-1 sm:flex">
              {links.map(({ to, label }) => {
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

        <div className="flex items-center gap-4">
          {state.isAuthenticated && <SyncIndicator />}
          {state.isAuthenticated ? <UserMenu /> : <LoginButton />}
        </div>
      </div>
    </nav>
  );
}
