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

  // Convert ISO timestamps to ms-since-epoch so the X axis can be
  // scaled proportionally to real time rather than treating every
  // data point as an equal-width category.
  const numericData = data.map((point) => ({
    ...point,
    t: new Date(point.ts).getTime(),
  }));

  const activeStatuses = APPLICATION_STATUSES.filter((s) =>
    data.some((point) => point[s] > 0),
  );

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={numericData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => formatDate(new Date(t).toISOString())}
            tick={{ fontSize: 11 }}
            minTickGap={80}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(t: number) => formatDate(new Date(t).toISOString())}
            formatter={(value, name) => [value, formatStatus(name as ApplicationStatus)]}
          />
          <Legend formatter={(name) => formatStatus(name as ApplicationStatus)} />
          {activeStatuses.map((status) => (
            <Line
              key={status}
              type="monotone"
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
