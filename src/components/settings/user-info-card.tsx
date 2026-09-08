import type { AuthUser } from "../../types/auth";
import { TitledCard } from "../ui/card";

export function UserInfoCard({ user }: { user: AuthUser }) {
  return (
    <TitledCard title="Account">
      <div className="flex items-center gap-4">
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-14 w-14 rounded-full"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>
    </TitledCard>
  );
}
