export const APPLICATION_STATUSES = [
  "bookmarked",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Status state machine — each status is an action/outcome.
 *
 * Categories:
 *   Pre-Interview : bookmarked, applied
 *   Active        : interviewing
 *   Complete      : offered, rejected, withdrawn, ghosted
 *
 * Valid transitions:
 *   bookmarked   → applied, withdrawn
 *   applied      → interviewing, rejected, ghosted, withdrawn
 *   interviewing → offered, rejected, withdrawn
 *   offered      → (terminal)
 *   rejected     → (terminal)
 *   withdrawn    → (terminal)
 *   ghosted      → (terminal)
 */
export const STATUS_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  bookmarked:   ["applied", "withdrawn"],
  applied:      ["interviewing", "rejected", "ghosted", "withdrawn"],
  interviewing: ["offered", "rejected", "withdrawn"],
  offered:      [],
  rejected:     [],
  withdrawn:    [],
  ghosted:      [],
} as const;

/** Pre-interview: not yet in an active interview loop. */
export const PRE_INTERVIEW_STATUSES: readonly ApplicationStatus[] = [
  "bookmarked",
  "applied",
] as const;

/** Active: currently in an interview process. */
export const ACTIVE_STATUSES: readonly ApplicationStatus[] = [
  "interviewing",
] as const;

/** Complete: application journey is finished. */
export const COMPLETE_STATUSES: readonly ApplicationStatus[] = [
  "offered",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;

/** Status category for display grouping. */
export type StatusCategory = "pre-interview" | "active" | "complete";

export const STATUS_CATEGORY: Record<ApplicationStatus, StatusCategory> = {
  bookmarked:   "pre-interview",
  applied:      "pre-interview",
  interviewing: "active",
  offered:      "complete",
  rejected:     "complete",
  withdrawn:    "complete",
  ghosted:      "complete",
} as const;

export const INTEREST_LEVELS = ["high", "medium", "low"] as const;

export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "INR",
  "OTHER",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export interface Application {
  id: string;
  position: string;
  companyName: string;
  companyWebsite: string;
  city: string;
  state: string;
  country: string;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: Currency;
  jobPostingUrl: string;
  interest: InterestLevel;
  status: ApplicationStatus;
  lastUpdated: string;
  notes: string;
  dateApplied: string;
}

export type ApplicationFormData = Omit<Application, "id" | "lastUpdated">;

export interface ApplicationFilters {
  status?: ApplicationStatus[];
  interest?: InterestLevel[];
  companyName?: string;
  remote?: boolean | null;
  dateRange?: { from: string; to: string };
  search?: string;
}
