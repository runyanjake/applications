import type { CategoryPoint } from "../../types/chart";
import { ChartFrame, type ChartProps } from "./chart-frame";

interface DonutChartProps extends ChartProps {
  data: CategoryPoint[];
}

/** Donut breakdown of a categorical count (status, company, remote, ...). */
export function DonutChart({ data, title, height = 300 }: DonutChartProps) {
  if (data.every((point) => point.value === 0)) return null;

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["38%", "68%"],
        center: ["50%", "44%"],
        data: data.map((point) => ({
          name: point.label,
          value: point.value,
          itemStyle: { color: point.color },
        })),
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
        },
        label: { show: false },
        labelLine: { show: false },
      },
    ],
  };

  return <ChartFrame option={option} title={title} height={height} />;
}
