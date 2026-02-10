import type {
  Application,
  ApplicationStatus,
  Currency,
  InterestLevel,
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
    currency: (row[10] as Currency) || "USD",
    jobPostingUrl: row[11] ?? "",
    interest: (row[12] as InterestLevel) || "medium",
    status: (row[13] as ApplicationStatus) || "bookmarked",
    lastUpdated: row[14] ?? new Date().toISOString(),
    notes: row[15] ?? "",
    dateApplied: row[16] ?? "",
  };
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
