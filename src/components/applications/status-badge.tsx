import type { ApplicationStatus } from "../../types/application";
import { formatStatus, statusColor } from "../../utils/formatters";

interface StatusBadgeProps {
  status: ApplicationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
}
