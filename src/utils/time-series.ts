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
import { historyOf } from "./activity";

/**
 * Status counts over time, from each application's history log.
 * - counts: exact, one point per status change (no periodic sampling)
 * - entered: transitions into each status per day | week | month, calendar-aligned
 *   in the user's timezone (DST-safe)
 */

export type SeriesInterval = "auto" | "day" | "week" | "month";
export type ResolvedInterval = Exclude<SeriesInterval, "auto">;

/** A status's count after each change to it, as [epoch ms, count]; 0 before the first. */
export type StatusChanges = [number, number][];

export interface StatusCounts {
  startMs: number;
  endMs: number;
  changes: Partial<Record<ApplicationStatus, StatusChanges>>;
}

export interface EnteredQuery {
  interval: SeriesInterval;
  timeZone: string;
  now?: number;
}

export interface EnteredSeries {
  interval: ResolvedInterval;
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
  // A missing or unparseable timestamp would land in an arbitrary bucket
  return applications
    .flatMap(historyOf)
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

export function buildStatusCounts(
  applications: Application[],
  now = Date.now(),
): StatusCounts | null {
  const events = collectEvents(applications);
  if (events.length === 0) return null;

  const current = zeroCounts();
  const changes: StatusCounts["changes"] = {};
  let ms = 0;

  for (let i = 0; i < events.length; ) {
    ms = Date.parse(events[i]!.ts);
    const touched = new Set<ApplicationStatus>();

    // Simultaneous events collapse into one point per status
    for (; i < events.length && Date.parse(events[i]!.ts) === ms; i++) {
      const { from, to } = events[i]!;
      if (from !== null) {
        current[from]--;
        touched.add(from);
      }
      current[to]++;
      touched.add(to);
    }

    for (const status of touched) {
      const list = (changes[status] ??= []);
      if ((list[list.length - 1]?.[1] ?? 0) !== current[status]) {
        list.push([ms, current[status]]);
      }
    }
  }

  return {
    startMs: Date.parse(events[0]!.ts),
    endMs: Math.max(now, ms),
    changes,
  };
}

/** Count at `ms`: the value of the last change at or before it. */
export function countAt(changes: StatusChanges, ms: number): number {
  let lo = 0;
  let hi = changes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (changes[mid]![0] <= ms) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 ? 0 : changes[lo - 1]![1];
}

export function buildEnteredSeries(
  applications: Application[],
  { interval, timeZone, now = Date.now() }: EnteredQuery,
): EnteredSeries | null {
  const events = collectEvents(applications);
  if (events.length === 0) return null;

  const firstMs = Date.parse(events[0]!.ts);
  const resolved = resolveInterval(interval, firstMs, now);
  const { floor, step } = BUCKET[resolved];
  const context = { in: tz(timeZone) };

  const points: StatusTimelinePoint[] = [];
  const lastBucket = floor(now, context).getTime();
  let i = 0;

  for (
    let bucket = floor(firstMs, context);
    bucket.getTime() <= lastBucket;
    bucket = step(bucket, 1, context)
  ) {
    const end = step(bucket, 1, context).getTime();
    const entered = zeroCounts();

    for (; i < events.length && Date.parse(events[i]!.ts) < end; i++) {
      entered[events[i]!.to]++;
    }

    points.push({ ts: new Date(bucket.getTime()).toISOString(), ...entered });
  }

  return { interval: resolved, points };
}
