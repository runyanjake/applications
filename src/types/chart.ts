import type { ApplicationStatus } from "./application";

/** One labelled, coloured slice/bar of a categorical chart. */
export interface CategoryPoint {
  label: string;
  value: number;
  color: string;
}

/** Running per-status counts at a single instant. */
export type StatusTimelinePoint = { ts: string } & Record<
  ApplicationStatus,
  number
>;
