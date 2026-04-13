import ReactECharts from "echarts-for-react";

interface CompanyDataPoint {
  label: string;
  value: number;
}

interface TopCompaniesChartProps {
  data: CompanyDataPoint[];
  title?: string;
  height?: number;
}

export function TopCompaniesChart({ data, title, height = 300 }: TopCompaniesChartProps) {
  if (data.length === 0) return null;

  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 130, right: 20, top: 10, bottom: 30 },
    xAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
    yAxis: { type: "category", data: data.map((d) => d.label), axisLabel: { fontSize: 12 } },
    series: [{
      type: "bar",
      name: "Applications",
      data: data.map((d) => d.value),
      itemStyle: { color: "#6366f1" },
      emphasis: { itemStyle: { color: "#4f46e5" } },
    }],
  };

  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}
