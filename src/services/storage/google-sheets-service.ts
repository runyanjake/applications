import type { Application } from "../../types/application";
import type { StorageConfig, StorageService } from "../../types/storage";
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

  async getAll(): Promise<Application[]> {
    await this.ensureHeaderRow();
    const response =
      await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:Q`,
      });
    const rows = response.result.values ?? [];
    if (rows.length <= 1) return [];
    return rows.slice(1).map(rowToApplication);
  }

  async writeAll(applications: Application[]): Promise<void> {
    const dataRows = applications.map(applicationToRow);
    const allRows = [HEADER_ROW, ...dataRows];
    const endRow = allRows.length;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A1:Q${endRow}`,
      valueInputOption: "USER_ENTERED",
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
        range: `${this.sheetName}!A1:Q1`,
      });
    const firstRow = response.result.values?.[0];
    if (!firstRow || firstRow[0] !== HEADER_ROW[0]) {
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:Q1`,
        valueInputOption: "RAW",
        resource: { values: [HEADER_ROW] },
      });
    }
  }
}
