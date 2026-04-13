import ReactECharts from "echarts-for-react";

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface InterestDistributionChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function InterestDistributionChart({
  data,
  title,
  height = 300,
}: InterestDistributionChartProps) {
  if (data.length === 0) return null;

  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: "category", data: data.map((d) => d.label), axisLabel: { fontSize: 12 } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
    series: [{
      type: "bar",
      name: "Applications",
      data: data.map((d) => ({ value: d.value, itemStyle: { color: d.color } })),
      emphasis: { itemStyle: { opacity: 0.8 } },
    }],
  };

  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}
