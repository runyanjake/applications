import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SalaryDataPoint {
  label: string;
  min: number;
  max: number;
}

interface SalaryRangeChartProps {
  data: SalaryDataPoint[];
  title?: string;
  height?: number;
}

export function SalaryRangeChart({
  data,
  title,
  height = 300,
}: SalaryRangeChartProps) {
  if (data.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            dataKey="label"
            type="category"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="min" fill="#a5b4fc" name="Min Salary" />
          <Bar dataKey="max" fill="#6366f1" name="Max Salary" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
