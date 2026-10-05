import { useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "../../types/application";
import { STATUS_HEX } from "../../config/theme";
import { formatStatus } from "../../utils/formatters";
import { getTimezone } from "../../utils/timezone-store";
import {
  buildEnteredSeries,
  buildStatusCounts,
  countAt,
  type ResolvedInterval,
  type SeriesInterval,
  type StatusChanges,
} from "../../utils/time-series";
import { SegmentedControl } from "../ui/segmented-control";
import { inputClass } from "../ui/field";
import { ChartFrame, type ChartProps, type TooltipParam } from "./chart-frame";

interface StatusTimelineChartProps extends ChartProps {
  applications: Application[];
}

type TimelineMode = "count" | "entered";

const INTERVAL_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const satisfies readonly { value: SeriesInterval; label: string }[];

const MODE_OPTIONS: { value: TimelineMode; label: string; caption: string }[] = [
  {
    value: "count",
    label: "Applications in status",
    caption: "Applications in each status, updated at every status change.",
  },
  {
    value: "entered",
    label: "Moves into status",
    caption: "How many applications moved into each status during the period.",
  },
];

/** Share of the time span a curve takes to ease from one count to the next. */
const EASE_FRACTION = 0.012;

/** Above this many changes in one series, points are drawn only on hover. */
const MAX_SYMBOLS = 40;

const GRID = { left: 8, right: 16, top: 12, bottom: 44 };
const LEGEND = { bottom: 0, type: "scroll", textStyle: { fontSize: 11 } };

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

function marker(color: string): string {
  return `<span style="display:inline-block;margin-right:4px;border-radius:50%;width:8px;height:8px;background-color:${color}"></span>`;
}

/**
 * Change points → line data. Each count holds flat until shortly before the next
 * change, then eases into it, so the curve never implies change between events.
 */
function toCurve(
  changes: StatusChanges,
  startMs: number,
  endMs: number,
  easeMs: number,
) {
  const showSymbol = changes.length <= MAX_SYMBOLS;
  const data: { value: [number, number]; symbol?: string }[] = [];
  let prevMs = startMs;
  let prev = 0;

  for (const [ms, count] of changes) {
    const ease = Math.min(easeMs, (ms - prevMs) / 2);
    if (ease > 0) {
      if (data.length === 0) data.push({ value: [startMs, 0], symbol: "none" });
      data.push({ value: [ms - ease, prev], symbol: "none" });
    }
    data.push(showSymbol ? { value: [ms, count] } : { value: [ms, count], symbol: "none" });
    prevMs = ms;
    prev = count;
  }
  if (endMs > prevMs) data.push({ value: [endMs, prev], symbol: "none" });
  return data;
}

/** Applications per status over time: exact counts, or entries per calendar bucket. */
export function StatusTimelineChart({
  applications,
  title,
  height = 300,
}: StatusTimelineChartProps) {
  const [mode, setMode] = useState<TimelineMode>("count");
  const [interval, setBucketInterval] = useState<SeriesInterval>("auto");

  const counts = useMemo(() => buildStatusCounts(applications), [applications]);
  const entered = useMemo(
    () =>
      mode === "entered"
        ? buildEnteredSeries(applications, { interval, timeZone: getTimezone() })
        : null,
    [applications, interval, mode],
  );

  if (!counts) return null;

  let option: object;
  let caption = MODE_OPTIONS.find((o) => o.value === mode)!.caption;

  if (mode === "count") {
    const { startMs, endMs, changes } = counts;
    // Only plot statuses that ever had a value, so the legend stays readable
    const active = APPLICATION_STATUSES.filter((status) =>
      changes[status]?.some(([, count]) => count > 0),
    );
    const easeMs = (endMs - startMs) * EASE_FRACTION;

    option = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", snap: false },
        formatter: (params: TooltipParam[]) => {
          const ms = Number(params[0]?.axisValue);
          if (!Number.isFinite(ms)) return "";
          const rows = active
            .map((status): [ApplicationStatus, number] => [
              status,
              countAt(changes[status]!, ms),
            ])
            .filter(([, count]) => count > 0)
            .map(
              ([status, count]) =>
                `${marker(STATUS_HEX[status])}${formatStatus(status)}: <b>${count}</b>`,
            );
          return [
            `<b>${formatBucket(ms, "day")}</b>`,
            ...(rows.length ? rows : ["None"]),
          ].join("<br/>");
        },
      },
      legend: LEGEND,
      grid: GRID,
      xAxis: {
        type: "time",
        min: startMs,
        max: endMs,
        axisLabel: {
          fontSize: 11,
          hideOverlap: true,
          formatter: (ts: number) => formatBucket(ts, "day"),
        },
      },
      yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
      series: active.map((status) => ({
        name: formatStatus(status),
        type: "line",
        itemStyle: { color: STATUS_HEX[status] },
        data: toCurve(changes[status]!, startMs, endMs, easeMs),
        // Horizontal tangents at each point: smooth, but never overshoots a count
        smooth: 0.5,
        smoothMonotone: "x",
        symbolSize: 8,
        lineStyle: { width: 2 },
      })),
    };
  } else {
    if (!entered) return null;
    const { points } = entered;
    const active = APPLICATION_STATUSES.filter((status) =>
      points.some((point) => point[status] > 0),
    );
    caption += ` One bar per ${entered.interval}${interval === "auto" ? " (auto)" : ""}.`;

    option = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: TooltipParam[]) => {
          const first = params[0];
          if (!first || !Array.isArray(first.value)) return "";
          const header = `<b>${formatBucket(Number(first.value[0]), entered.interval)}</b>`;
          const rows = params
            .filter((p) => Array.isArray(p.value) && Number(p.value[1]) > 0)
            .map(
              (p) =>
                `${p.marker}${p.seriesName}: <b>${(p.value as (number | string)[])[1]}</b>`,
            );
          return [header, ...(rows.length ? rows : ["None"])].join("<br/>");
        },
      },
      legend: LEGEND,
      grid: GRID,
      xAxis: {
        type: "time",
        axisLabel: {
          fontSize: 11,
          hideOverlap: true,
          formatter: (ts: number) =>
            formatBucket(ts, entered.interval === "month" ? "month" : "day"),
        },
      },
      yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 12 } },
      series: active.map((status) => ({
        name: formatStatus(status),
        type: "bar",
        stack: "entered",
        barMaxWidth: 24,
        itemStyle: { color: STATUS_HEX[status] },
        // [bucket-start-ms, value] pairs — the time axis spaces these proportionally
        data: points.map((point) => [new Date(point.ts).getTime(), point[status]]),
      })),
    };
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {title && (
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {mode === "entered" && (
            <SegmentedControl
              options={INTERVAL_OPTIONS}
              value={interval}
              onChange={setBucketInterval}
              size="sm"
            />
          )}
          <select
            aria-label="Value shown"
            value={mode}
            onChange={(e) => setMode(e.target.value as TimelineMode)}
            className={`${inputClass} w-auto py-1 text-xs`}
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ChartFrame option={option} caption={caption} height={height} />
    </div>
  );
}
