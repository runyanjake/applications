import { APPLICATION_STATUSES } from "../../types/application";
import type { StatusTimelinePoint } from "../../types/chart";
import { STATUS_HEX } from "../../config/theme";
import { formatDate, formatStatus } from "../../utils/formatters";
import { ChartFrame, type ChartProps, type TooltipParam } from "./chart-frame";

interface StatusTimelineChartProps extends ChartProps {
  data: StatusTimelinePoint[];
}

/** Running count of applications in each status over time. */
export function StatusTimelineChart({
  data,
  title,
  height = 300,
}: StatusTimelineChartProps) {
  if (data.length === 0) return null;

  // Only plot statuses that were ever reached, so the legend stays readable
  const activeStatuses = APPLICATION_STATUSES.filter((status) =>
    data.some((point) => point[status] > 0),
  );

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      formatter: (params: TooltipParam[]) => {
        const first = params[0];
        if (!first) return "";
        const header = `<b>${formatDate(new Date(first.axisValue ?? "").toISOString())}</b>`;
        const rows = params
          .filter((p) => Array.isArray(p.value) && Number(p.value[1]) > 0)
          .map(
            (p) =>
              `${p.marker}${p.seriesName}: <b>${(p.value as (number | string)[])[1]}</b>`,
          )
          .join("<br/>");
        return `${header}<br/>${rows}`;
      },
    },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 11,
        formatter: (ts: number) => formatDate(new Date(ts).toISOString()),
      },
    },
    yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
    series: activeStatuses.map((status) => ({
      name: formatStatus(status),
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2 },
      itemStyle: { color: STATUS_HEX[status] },
      // [timestamp-ms, count] pairs — the time axis spaces these proportionally
      data: data.map((point) => [new Date(point.ts).getTime(), point[status]]),
    })),
  };

  return <ChartFrame option={option} title={title} height={height} />;
}
