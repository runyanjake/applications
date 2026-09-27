import { googleFetch } from "./google-fetch";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PAGE_SIZE = 50;

export interface DriveSpreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
}

/** Drive query strings quote with ' and escape with \ */
function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** The user's Google Sheets, most recent first, optionally filtered by name. */
export async function listSpreadsheets(
  nameFilter = "",
): Promise<DriveSpreadsheet[]> {
  const clauses = [`mimeType='${SPREADSHEET_MIME}'`, "trashed=false"];
  const name = nameFilter.trim();
  if (name) clauses.push(`name contains '${escapeQueryValue(name)}'`);

  const params = new URLSearchParams({
    q: clauses.join(" and "),
    orderBy: "recency desc",
    pageSize: String(PAGE_SIZE),
    fields: "files(id,name,modifiedTime)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });

  const result = await googleFetch<{ files?: DriveSpreadsheet[] }>(
    `${DRIVE_FILES_URL}?${params}`,
  );
  return result.files ?? [];
}
