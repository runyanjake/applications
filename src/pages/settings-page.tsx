import { useAuth } from "../hooks/use-auth";
import { PageHeader } from "../components/shared/page-header";
import { UserInfoCard } from "../components/settings/user-info-card";
import { SpreadsheetCard } from "../components/settings/spreadsheet-card";
import { AuthLifecycleCard } from "../components/settings/auth-lifecycle-card";
import { SyncCard } from "../components/settings/sync-card";

export function SettingsPage() {
  const { state } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        {state.user && <UserInfoCard user={state.user} />}
        <SpreadsheetCard />
        <SyncCard />
        <AuthLifecycleCard />
      </div>
    </div>
  );
}
