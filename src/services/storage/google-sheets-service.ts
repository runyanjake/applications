import type { Application, ApplicationFormData } from "../../types/application";
import type { StorageConfig, StorageService } from "../../types/storage";
import { generateId } from "../../utils/id";
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

  async create(data: ApplicationFormData): Promise<Application> {
    await this.ensureHeaderRow();
    const app: Application = {
      ...data,
      id: generateId(),
      lastUpdated: new Date().toISOString(),
    };
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:Q`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [applicationToRow(app)] },
    });
    return app;
  }

  async update(
    id: string,
    data: Partial<Application>,
  ): Promise<Application> {
    const rows = await this.getRawRows();
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) throw new Error(`Application ${id} not found`);

    const existing = rowToApplication(rows[rowIndex]!);
    const updated: Application = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    const sheetRow = rowIndex + 2;

    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A${sheetRow}:Q${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [applicationToRow(updated)] },
    });
    return updated;
  }

  async delete(id: string): Promise<void> {
    const rows = await this.getRawRows();
    const rowIndex = rows.findIndex((row) => row[0] === id);
    if (rowIndex === -1) return;

    const sheetId = await this.getSheetId();
    const startIndex = rowIndex + 1;

    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex,
                endIndex: startIndex + 1,
              },
            },
          },
        ],
      },
    });
  }

  private async getRawRows(): Promise<string[][]> {
    const response =
      await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:Q`,
      });
    const rows = response.result.values ?? [];
    return rows.length > 1 ? rows.slice(1) : [];
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
