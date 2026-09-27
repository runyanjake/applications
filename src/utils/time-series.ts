import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tz } from "@date-fns/tz";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
  type HistoryEntry,
} from "../types/application";
import type { StatusTimelinePoint } from "../types/chart";

/**
 * Status counts over time, downsampled from each application's history log.
 * - interval: day | week | month, calendar-aligned in the user's timezone (DST-safe)
 * - agg: last (end of bucket) | max (peak in bucket) | entered (transitions in)
 * - fill: carry forward through empty buckets
 */

export type SeriesInterval = "auto" | "day" | "week" | "month";
export type ResolvedInterval = Exclude<SeriesInterval, "auto">;

export type SeriesAggregator = "last" | "max" | "entered";

export interface StatusSeriesQuery {
  interval: SeriesInterval;
  aggregator: SeriesAggregator;
  timeZone: string;
  now?: number;
}

export interface StatusSeries {
  interval: ResolvedInterval;
  aggregator: SeriesAggregator;
  /** One point per bucket; `ts` is the bucket start. */
  points: StatusTimelinePoint[];
}

type Counts = Record<ApplicationStatus, number>;

const zeroCounts = (): Counts =>
  Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Counts;

/** Most buckets auto will produce before stepping up to a coarser interval. */
const AUTO_MAX_BUCKETS = 120;

type Context = { in: ReturnType<typeof tz> };

/** Calendar alignment for each interval; weeks start on Monday (ISO). */
const BUCKET: Record<
  ResolvedInterval,
  {
    floor: (date: Date | number, context: Context) => Date;
    step: (date: Date, amount: number, context: Context) => Date;
  }
> = {
  day: {
    floor: (date, context) => startOfDay(date, context),
    step: (date, amount, context) => addDays(date, amount, context),
  },
  week: {
    floor: (date, context) => startOfWeek(date, { ...context, weekStartsOn: 1 }),
    step: (date, amount, context) => addWeeks(date, amount, context),
  },
  month: {
    floor: (date, context) => startOfMonth(date, context),
    step: (date, amount, context) => addMonths(date, amount, context),
  },
};

function collectEvents(applications: Application[]): HistoryEntry[] {
  const events: HistoryEntry[] = [];
  for (const app of applications) {
    // `history` is absent on records restored from an older session payload
    const history = app.history ?? [];
    if (history.length > 0) events.push(...history);
    // Legacy application with no history: treat it as a single creation event
    else events.push({ ts: app.lastUpdated, from: null, to: app.status });
  }
  // A missing or unparseable timestamp would land in an arbitrary bucket
  return events
    .filter((event) => event.ts && !Number.isNaN(Date.parse(event.ts)))
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

export function resolveInterval(
  interval: SeriesInterval,
  firstMs: number,
  nowMs: number,
): ResolvedInterval {
  if (interval !== "auto") return interval;
  const days = differenceInCalendarDays(nowMs, firstMs) + 1;
  if (days <= AUTO_MAX_BUCKETS) return "day";
  if (days / 7 <= AUTO_MAX_BUCKETS) return "week";
  return "month";
}

export function buildStatusSeries(
  applications: Application[],
  { interval, aggregator, timeZone, now = Date.now() }: StatusSeriesQuery,
): StatusSeries | null {
  const events = collectEvents(applications);
  if (events.length === 0) return null;

  const firstMs = Date.parse(events[0]!.ts);
  const resolved = resolveInterval(interval, firstMs, now);
  const { floor, step } = BUCKET[resolved];
  const context = { in: tz(timeZone) };

  const current = zeroCounts();
  const points: StatusTimelinePoint[] = [];
  const lastBucket = floor(now, context).getTime();
  let i = 0;

  for (
    let bucket = floor(firstMs, context);
    bucket.getTime() <= lastBucket;
    bucket = step(bucket, 1, context)
  ) {
    const end = step(bucket, 1, context).getTime();
    const max = { ...current };
    const entered = zeroCounts();

    for (; i < events.length && Date.parse(events[i]!.ts) < end; i++) {
      const { from, to } = events[i]!;
      if (from !== null) current[from]--;
      current[to]++;
      entered[to]++;
      max[to] = Math.max(max[to], current[to]);
    }

    const values =
      aggregator === "entered" ? entered : aggregator === "max" ? max : current;
    points.push({ ts: new Date(bucket.getTime()).toISOString(), ...values });
  }

  return { interval: resolved, aggregator, points };
}
