import type { Application } from "../../types/application";
import type { StorageConfig, StorageService, ValidationResult } from "../../types/storage";
import {
  HEADER_ROW,
  applicationToRow,
  rowToApplication,
} from "../../utils/sheet-mapper";

export class GoogleSheetsService implements StorageService {
  private spreadsheetId = "";
  private sheetName = "Applications";

  configure(config: StorageConfig): void {
    this.spreadsheetId = config.spreadsheetId;
    this.sheetName = config.sheetName;
  }

  isConfigured(): boolean {
    return !!this.spreadsheetId;
  }

  async validateStructure(): Promise<ValidationResult> {
    try {
      const res = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheets = res.result.sheets ?? [];
      const appSheet = sheets.find(
        (s) => s.properties?.title === this.sheetName,
      );

      if (!appSheet) {
        return { valid: true, needsSheetCreation: true };
      }

      // Sheet exists — if it has data, verify the header row
      const headerRes = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:A1`,
      });
      const firstCell = headerRes.result.values?.[0]?.[0];

      if (firstCell && firstCell !== HEADER_ROW[0]) {
        return {
          valid: false,
          error: `The "${this.sheetName}" sheet doesn't look like a PWS Applications sheet — expected column A to be "${HEADER_ROW[0]}", found "${firstCell}". Please select the correct spreadsheet.`,
        };
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error:
          err instanceof Error
            ? err.message
            : "Could not access the spreadsheet.",
      };
    }
  }

  async createApplicationsSheet(): Promise<void> {
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [{ addSheet: { properties: { title: this.sheetName } } }],
      },
    });
  }

  async getAll(): Promise<Application[]> {
    await this.ensureHeaderRow();
    const response =
      await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:R`,
      });
    const rows = response.result.values ?? [];
    if (rows.length <= 1) return [];
    return rows.slice(1).map(rowToApplication);
  }

  async writeAll(applications: Application[]): Promise<void> {
    const emptyHistoryIds = applications
      .filter((a) => (a.history ?? []).length === 0)
      .map((a) => a.id);
    if (emptyHistoryIds.length > 0) {
      console.warn("[writeAll] Apps with empty history before write:", emptyHistoryIds);
    } else {
      console.debug("[writeAll] All", applications.length, "apps have history — writing");
    }

    const dataRows = applications.map(applicationToRow);
    const allRows = [HEADER_ROW, ...dataRows];
    const endRow = allRows.length;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A1:R${endRow}`,
      valueInputOption: "RAW",
      resource: { values: allRows },
    });

    // Clear any leftover rows below the current data
    const sheetId = await this.getSheetId();
    const response =
      await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
    const sheet = response.result.sheets?.find(
      (s) => s.properties?.sheetId === sheetId,
    );
    const totalRows = sheet?.properties?.gridProperties?.rowCount ?? 1000;

    if (totalRows > endRow) {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: endRow,
                  endIndex: totalRows,
                },
              },
            },
          ],
        },
      });
    }
  }

  private async getSheetId(): Promise<number> {
    const response =
      await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
    const sheet = response.result.sheets?.find(
      (s) => s.properties?.title === this.sheetName,
    );
    return sheet?.properties?.sheetId ?? 0;
  }

  private async ensureHeaderRow(): Promise<void> {
    const response =
      await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:R1`,
      });
    const firstRow = response.result.values?.[0];
    // Write header if: missing entirely, wrong first cell, or fewer columns than expected
    // (the last case handles sheets created before the History column was added)
    const needsUpdate =
      !firstRow ||
      firstRow[0] !== HEADER_ROW[0] ||
      firstRow.length < HEADER_ROW.length;
    if (needsUpdate) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:R1`,
        valueInputOption: "RAW",
        resource: { values: [HEADER_ROW] },
      });
    }
  }
}
