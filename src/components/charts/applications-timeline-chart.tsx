import ReactECharts from "echarts-for-react";
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

  const activeStatuses = APPLICATION_STATUSES.filter((s) =>
    data.some((point) => point[s] > 0),
  );

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params: any[]) => {
        if (!params.length) return "";
        const ts = params[0]?.axisValue;
        const header = `<b>${formatDate(new Date(ts).toISOString())}</b>`;
        const rows = params
          .filter((p) => p.value[1] > 0)
          .map((p) => `${p.marker}${p.seriesName}: <b>${p.value[1]}</b>`)
          .join("<br/>");
        return `${header}<br/>${rows}`;
      },
    },
    legend: {
      bottom: 0,
      type: "scroll",
      textStyle: { fontSize: 11 },
    },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 11,
        formatter: (ts: number) => formatDate(new Date(ts).toISOString()),
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { fontSize: 12 },
    },
    series: activeStatuses.map((status) => ({
      name: formatStatus(status),
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2 },
      itemStyle: { color: STATUS_COLORS[status] },
      // [timestamp-ms, count] pairs — ECharts time axis spaces these proportionally
      data: data.map((point) => [new Date(point.ts).getTime(), point[status]]),
    })),
  };

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      )}
      <ReactECharts option={option} style={{ height }} notMerge />
    </div>
  );
}
