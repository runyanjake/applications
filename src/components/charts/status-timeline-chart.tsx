import { useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  type Application,
} from "../../types/application";
import { STATUS_HEX } from "../../config/theme";
import { formatStatus } from "../../utils/formatters";
import { getTimezone } from "../../utils/timezone-store";
import {
  buildStatusSeries,
  type ResolvedInterval,
  type SeriesAggregator,
  type SeriesInterval,
} from "../../utils/time-series";
import { SegmentedControl } from "../ui/segmented-control";
import { inputClass } from "../ui/field";
import { ChartFrame, type ChartProps, type TooltipParam } from "./chart-frame";

interface StatusTimelineChartProps extends ChartProps {
  applications: Application[];
}

const INTERVAL_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const satisfies readonly { value: SeriesInterval; label: string }[];

const AGGREGATOR_OPTIONS: {
  value: SeriesAggregator;
  label: string;
  caption: string;
}[] = [
  {
    value: "last",
    label: "Count at end of period",
    caption: "Applications in each status when the period closed.",
  },
  {
    value: "max",
    label: "Peak during period",
    caption: "Highest number of applications in each status at any point in the period.",
  },
  {
    value: "entered",
    label: "Moves into status",
    caption: "How many applications moved into each status during the period.",
  },
];

/** Bucket start → a label naming the whole bucket, in the user's timezone. */
function formatBucket(ms: number, interval: ResolvedInterval): string {
  const timeZone = getTimezone();
  if (interval === "month") {
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      timeZone,
    });
  }
  const day = new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  });
  return interval === "week" ? `Week of ${day}` : day;
}

/** Applications per status over time, downsampled to calendar buckets. */
export function StatusTimelineChart({
  applications,
  title,
  height = 300,
}: StatusTimelineChartProps) {
  const [interval, setBucketInterval] = useState<SeriesInterval>("auto");
  const [aggregator, setAggregator] = useState<SeriesAggregator>("last");

  const series = useMemo(
    () =>
      buildStatusSeries(applications, {
        interval,
        aggregator,
        timeZone: getTimezone(),
      }),
    [applications, interval, aggregator],
  );

  if (!series) return null;
  const { points } = series;
  const isCounter = aggregator === "entered";

  // Only plot statuses that ever had a value, so the legend stays readable
  const activeStatuses = APPLICATION_STATUSES.filter((status) =>
    points.some((point) => point[status] > 0),
  );

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: isCounter ? "shadow" : "line" },
      formatter: (params: TooltipParam[]) => {
        const first = params[0];
        if (!first || !Array.isArray(first.value)) return "";
        const header = `<b>${formatBucket(Number(first.value[0]), series.interval)}</b>`;
        const rows = params
          .filter((p) => Array.isArray(p.value) && Number(p.value[1]) > 0)
          .map(
            (p) =>
              `${p.marker}${p.seriesName}: <b>${(p.value as (number | string)[])[1]}</b>`,
          );
        return [header, ...(rows.length ? rows : ["None"])].join("<br/>");
      },
    },
    legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: 11,
        hideOverlap: true,
        formatter: (ts: number) =>
          formatBucket(ts, series.interval === "month" ? "month" : "day"),
      },
    },
    yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
    series: activeStatuses.map((status) => ({
      name: formatStatus(status),
      itemStyle: { color: STATUS_HEX[status] },
      // [bucket-start-ms, value] pairs — the time axis spaces these proportionally
      data: points.map((point) => [new Date(point.ts).getTime(), point[status]]),
      ...(isCounter
        ? { type: "bar", stack: "entered", barMaxWidth: 24 }
        : {
            type: "line",
            // A count holds its value until the next bucket changes it; a
            // smoothed curve would invent fractional in-between values
            step: "end",
            showSymbol: points.length <= 60,
            symbolSize: 5,
            lineStyle: { width: 2 },
          }),
    })),
  };

  const caption = AGGREGATOR_OPTIONS.find((o) => o.value === aggregator)!.caption;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title && (
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            options={INTERVAL_OPTIONS}
            value={interval}
            onChange={setBucketInterval}
            size="sm"
          />
          <select
            aria-label="Value per period"
            value={aggregator}
            onChange={(e) => setAggregator(e.target.value as SeriesAggregator)}
            className={`${inputClass} w-auto py-1 text-xs`}
          >
            {AGGREGATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ChartFrame
        option={option}
        caption={`${caption} One point per ${series.interval}${
          interval === "auto" ? " (auto)" : ""
        }.`}
        height={height}
      />
    </div>
  );
}
