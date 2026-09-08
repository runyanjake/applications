import type { ApplicationStatus } from "../../types/application";
import { STATUS_BADGE } from "../../config/theme";
import { formatStatus } from "../../utils/formatters";
import { Badge } from "../ui/badge";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={STATUS_BADGE[status]}>{formatStatus(status)}</Badge>;
}
