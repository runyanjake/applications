import {
  ACTIVE_STATUSES,
  COMPLETE_STATUSES,
  PRE_INTERVIEW_STATUSES,
  type ApplicationStatus,
} from "../../types/application";
import { formatStatus } from "../../utils/formatters";

const GROUPS: { label: string; statuses: readonly ApplicationStatus[] }[] = [
  { label: "Pre-Interview", statuses: PRE_INTERVIEW_STATUSES },
  { label: "Active", statuses: ACTIVE_STATUSES },
  { label: "Complete", statuses: COMPLETE_STATUSES },
];

/** `<optgroup>` set shared by the status filter and the status form field. */
export function StatusOptionGroups() {
  return (
    <>
      {GROUPS.map(({ label, statuses }) => (
        <optgroup key={label} label={label}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
