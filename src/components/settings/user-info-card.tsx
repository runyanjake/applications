import type { AuthUser } from "../../types/auth";

interface UserInfoCardProps {
  user: AuthUser;
}

export function UserInfoCard({ user }: UserInfoCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Account</h2>
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
    </div>
  );
}
