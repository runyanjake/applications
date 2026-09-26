import type { PickerDocument } from "../../types/google";
import { googleFetch } from "./google-fetch";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PAGE_SIZE = 50;

export interface DriveSpreadsheet extends PickerDocument {
  modifiedTime?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

/** Drive query strings quote with ' and escape with \ */
function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * The user's Google Sheets, most recently used first, optionally filtered by
 * name. Replaces the Google Picker in the desktop app, which can't sign in to
 * Google inside an embedded browser window.
 */
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
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });

  const result = await googleFetch<{ files?: DriveFile[] }>(
    `${DRIVE_FILES_URL}?${params}`,
  );
  return (result.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    url: file.webViewLink ?? `https://docs.google.com/spreadsheets/d/${file.id}`,
    modifiedTime: file.modifiedTime,
  }));
}
