export const APPLICATION_STATUSES = [
  "bookmarked",
  "applying",
  "applied",
  "interviewing",
  "offered",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

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
