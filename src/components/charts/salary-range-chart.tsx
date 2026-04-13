import ReactECharts from "echarts-for-react";

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

export function SalaryRangeChart({ data, title, height = 300 }: SalaryRangeChartProps) {
  if (data.length === 0) return null;

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

  const option = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const label = params[0]?.name ?? "";
        const rows = params.map((p) => `${p.marker}${p.seriesName}: <b>${fmt(p.value)}</b>`).join("<br/>");
        return `${label}<br/>${rows}`;
      },
    },
    legend: { top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 130, right: 20, top: 30, bottom: 20 },
    xAxis: { type: "value", axisLabel: { formatter: fmt, fontSize: 12 } },
    yAxis: { type: "category", data: data.map((d) => d.label), axisLabel: { fontSize: 12 } },
    series: [
      { name: "Min Salary", type: "bar", data: data.map((d) => d.min), itemStyle: { color: "#a5b4fc" }, emphasis: { itemStyle: { color: "#818cf8" } } },
      { name: "Max Salary", type: "bar", data: data.map((d) => d.max), itemStyle: { color: "#6366f1" }, emphasis: { itemStyle: { color: "#4f46e5" } } },
    ],
  };

  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}
