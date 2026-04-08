import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ApplicationStatus } from "../../types/application";
import { APPLICATION_STATUSES } from "../../types/application";
import { formatDate, formatStatus } from "../../utils/formatters";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  bookmarked:   "#9ca3af",
  applied:      "#818cf8",
  interviewing: "#fbbf24",
  offered:      "#34d399",
  rejected:     "#f87171",
  withdrawn:    "#fb923c",
  ghosted:      "#a78bfa",
};

export type StatusTimelinePoint = { ts: string } & Record<ApplicationStatus, number>;

interface ApplicationsTimelineChartProps {
  data: StatusTimelinePoint[];
  title?: string;
  height?: number;
}

export function ApplicationsTimelineChart({
  data,
  title,
  height = 300,
}: ApplicationsTimelineChartProps) {
  if (data.length === 0) return null;

  // Only render lines for statuses that are non-zero in at least one point
  const activeStatuses = APPLICATION_STATUSES.filter((s) =>
    data.some((point) => point[s] > 0),
  );

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            tickFormatter={(ts: string) => formatDate(ts)}
            tick={{ fontSize: 11 }}
            minTickGap={60}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(ts: string) => formatDate(ts)}
            formatter={(value, name) => [value, formatStatus(name as ApplicationStatus)]}
          />
          <Legend formatter={(name) => formatStatus(name as ApplicationStatus)} />
          {activeStatuses.map((status) => (
            <Line
              key={status}
              type="stepAfter"
              dataKey={status}
              stroke={STATUS_COLORS[status]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
