import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./navbar";
import { ErrorBoundary } from "../routing/error-boundary";

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Keyed on the path so a crashed page recovers when you navigate away */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
