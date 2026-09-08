import type { ApplicationStatus, StatusCategory } from "../../types/application";
import { STATUS_CATEGORY, STATUS_TRANSITIONS } from "../../types/application";
import { formatStatus } from "../../utils/formatters";

const CATEGORY_LABELS: Record<StatusCategory, string> = {
  "pre-interview": "Pre-Interview",
  active: "Active",
  complete: "Complete",
};

const CATEGORY_COLORS: Record<StatusCategory, string> = {
  "pre-interview": "#4338ca",
  active: "#b45309",
  complete: "#047857",
};

/** Inline status editor, grouping the reachable statuses by category. */
export function StatusSelect({
  current,
  onChange,
  onBlur,
}: {
  current: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
  onBlur: () => void;
}) {
  const groups = new Map<StatusCategory, ApplicationStatus[]>();
  for (const status of [current, ...STATUS_TRANSITIONS[current]]) {
    const category = STATUS_CATEGORY[status];
    const existing = groups.get(category);
    if (existing) existing.push(status);
    else groups.set(category, [status]);
  }

  return (
    <select
      value={current}
      autoFocus
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      className="w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs"
    >
      {[...groups.entries()].map(([category, statuses]) => (
        <optgroup key={category} label={CATEGORY_LABELS[category]}>
          {statuses.map((status) => (
            <option
              key={status}
              value={status}
              style={{ color: CATEGORY_COLORS[category] }}
            >
              {formatStatus(status)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
