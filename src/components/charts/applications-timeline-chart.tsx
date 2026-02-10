import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TimelinePoint {
  date: string;
  count: number;
}

interface ApplicationsTimelineChartProps {
  data: TimelinePoint[];
  title?: string;
  height?: number;
}

export function ApplicationsTimelineChart({
  data,
  title,
  height = 300,
}: ApplicationsTimelineChartProps) {
  if (data.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            fill="#e0e7ff"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
