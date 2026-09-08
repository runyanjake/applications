import { useAuth } from "../../hooks/use-auth";
import { Button } from "../ui/button";
import { TitledCard } from "../ui/card";

export function AuthLifecycleCard() {
  const { login, logout } = useAuth();

  return (
    <TitledCard
      title="Authentication"
      description="Manage your Google account connection. Re-authenticating will refresh your access token. Signing out will clear all session data."
    >
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={login}>
          Re-authenticate
        </Button>
        <Button variant="danger" size="sm" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </TitledCard>
  );
}
