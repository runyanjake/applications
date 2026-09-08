import { useAuth } from "../hooks/use-auth";
import { PageHeader } from "../components/ui/page-header";
import { UserInfoCard } from "../components/settings/user-info-card";
import { SpreadsheetCard } from "../components/storage/spreadsheet-card";
import { AuthLifecycleCard } from "../components/settings/auth-lifecycle-card";
import { SyncCard } from "../components/sync/sync-card";
import { LLMProviderCard } from "../components/settings/llm-provider-card";
import { TimezoneCard } from "../components/settings/timezone-card";
import { DiagnosticsCard } from "../components/settings/diagnostics-card";

export function SettingsPage() {
  const { state } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        {state.user && <UserInfoCard user={state.user} />}
        <SpreadsheetCard />
        <LLMProviderCard />
        <TimezoneCard />
        <SyncCard />
        <AuthLifecycleCard />
        <DiagnosticsCard />
      </div>
    </div>
  );
}
