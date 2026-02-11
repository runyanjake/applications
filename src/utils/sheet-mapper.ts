import {
  APPLICATION_STATUSES,
  INTEREST_LEVELS,
  type Application,
  type ApplicationStatus,
  type Currency,
  type InterestLevel,
} from "../types/application";

export const HEADER_ROW = [
  "ID",
  "Position",
  "Company Name",
  "Company Website",
  "City",
  "State",
  "Country",
  "Remote",
  "Salary Min",
  "Salary Max",
  "Currency",
  "Job Posting URL",
  "Interest",
  "Status",
  "Last Updated",
  "Notes",
  "Date Applied",
];

export function rowToApplication(row: string[]): Application {
  return {
    id: row[0] ?? "",
    position: row[1] ?? "",
    companyName: row[2] ?? "",
    companyWebsite: row[3] ?? "",
    city: row[4] ?? "",
    state: row[5] ?? "",
    country: row[6] ?? "",
    remote: (row[7] ?? "").toLowerCase() === "true",
    salaryMin: row[8] ? Number(row[8]) : null,
    salaryMax: row[9] ? Number(row[9]) : null,
    currency: (row[10]?.toUpperCase() as Currency) || "USD",
    jobPostingUrl: row[11] ?? "",
    interest: parseInterest(row[12]),
    status: parseStatus(row[13]),
    lastUpdated: row[14] ?? new Date().toISOString(),
    notes: row[15] ?? "",
    dateApplied: row[16] ?? "",
  };
}

const LEGACY_STATUS_MAP: Record<string, ApplicationStatus> = {
  applying: "applied",
  accepted: "offered",
};

function parseStatus(raw: string | undefined): ApplicationStatus {
  const normalized = raw?.toLowerCase().trim();
  if (!normalized) return "bookmarked";
  if (APPLICATION_STATUSES.includes(normalized as ApplicationStatus)) {
    return normalized as ApplicationStatus;
  }
  return LEGACY_STATUS_MAP[normalized] ?? "bookmarked";
}

function parseInterest(raw: string | undefined): InterestLevel {
  const normalized = raw?.toLowerCase().trim();
  if (normalized && INTEREST_LEVELS.includes(normalized as InterestLevel)) {
    return normalized as InterestLevel;
  }
  return "medium";
}

export function applicationToRow(app: Application): string[] {
  return [
    app.id,
    app.position,
    app.companyName,
    app.companyWebsite,
    app.city,
    app.state,
    app.country,
    String(app.remote),
    app.salaryMin != null ? String(app.salaryMin) : "",
    app.salaryMax != null ? String(app.salaryMax) : "",
    app.currency,
    app.jobPostingUrl,
    app.interest,
    app.status,
    app.lastUpdated,
    app.notes,
    app.dateApplied,
  ];
}
