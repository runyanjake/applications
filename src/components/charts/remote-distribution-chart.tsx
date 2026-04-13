import ReactECharts from "echarts-for-react";

interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface RemoteDistributionChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
}

export function RemoteDistributionChart({
  data,
  title,
  height = 300,
}: RemoteDistributionChartProps) {
  if (data.every((d) => d.value === 0)) return null;

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    series: [{
      type: "pie",
      radius: ["38%", "68%"],
      center: ["50%", "44%"],
      data: data.map((d) => ({ name: d.label, value: d.value, itemStyle: { color: d.color } })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } },
      label: { show: false },
      labelLine: { show: false },
    }],
  };

  return (
    <div>
      {title && <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}
