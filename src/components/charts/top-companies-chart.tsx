import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CompanyDataPoint {
  label: string;
  value: number;
}

interface TopCompaniesChartProps {
  data: CompanyDataPoint[];
  title?: string;
  height?: number;
}

export function TopCompaniesChart({
  data,
  title,
  height = 300,
}: TopCompaniesChartProps) {
  if (data.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            dataKey="label"
            type="category"
            width={120}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="value" fill="#6366f1" name="Applications" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
