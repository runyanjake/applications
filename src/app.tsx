import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./config/routes";
import { RootLayout } from "./components/layout/root-layout";
import { AuthGate } from "./components/routing/auth-gate";
import { ProtectedRoute } from "./components/routing/protected-route";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { HomePage } from "./pages/home-page";
import { DashboardPage } from "./pages/dashboard-page";
import { ApplicationsPage } from "./pages/applications-page";
import { AddApplicationPage } from "./pages/add-application-page";
import { SettingsPage } from "./pages/settings-page";

// The charting library is a megabyte of JavaScript that only these two routes
// need, so it loads on demand rather than in the entry chunk.
const AnalyticsPage = lazy(() =>
  import("./pages/analytics-page").then((m) => ({ default: m.AnalyticsPage })),
);
const ReportPage = lazy(() =>
  import("./pages/report-page").then((m) => ({ default: m.ReportPage })),
);

function Deferred({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner className="py-32" />}>
      {children}
    </Suspense>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route
          index
          element={
            <AuthGate
              authenticated={<DashboardPage />}
              unauthenticated={<HomePage />}
            />
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.APPLICATIONS} element={<ApplicationsPage />} />
          <Route
            path={ROUTES.ANALYTICS}
            element={
              <Deferred>
                <AnalyticsPage />
              </Deferred>
            }
          />
          <Route path={ROUTES.ADD} element={<AddApplicationPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route
            path={ROUTES.REPORT}
            element={
              <Deferred>
                <ReportPage />
              </Deferred>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
