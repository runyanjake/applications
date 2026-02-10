import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface StatusDistributionChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function StatusDistributionChart({
  data,
  title,
  height = 300,
}: StatusDistributionChartProps) {
  if (data.every((d) => d.value === 0)) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
