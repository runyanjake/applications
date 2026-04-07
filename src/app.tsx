import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./config/routes";
import { RootLayout } from "./components/layout/root-layout";
import { AuthGate } from "./components/routing/auth-gate";
import { ProtectedRoute } from "./components/routing/protected-route";
import { HomePage } from "./pages/home-page";
import { DashboardPage } from "./pages/dashboard-page";
import { ApplicationsPage } from "./pages/applications-page";
import { AnalyticsPage } from "./pages/analytics-page";
import { AddApplicationPage } from "./pages/add-application-page";
import { SettingsPage } from "./pages/settings-page";
import { ReportPage } from "./pages/report-page";

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
          <Route
            path={ROUTES.APPLICATIONS}
            element={<ApplicationsPage />}
          />
          <Route
            path={ROUTES.ANALYTICS}
            element={<AnalyticsPage />}
          />
          <Route
            path={ROUTES.ADD}
            element={<AddApplicationPage />}
          />
          <Route
            path={ROUTES.SETTINGS}
            element={<SettingsPage />}
          />
          <Route
            path={ROUTES.REPORT}
            element={<ReportPage />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
