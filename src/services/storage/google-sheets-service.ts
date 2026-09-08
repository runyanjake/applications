import type { Application } from "../../types/application";
import type {
  StorageConfig,
  StorageService,
  ValidationResult,
} from "../../types/storage";
import {
  HEADER_ROW,
  applicationToRow,
  rowToApplication,
} from "../../utils/sheet-mapper";
import { describeGoogleError } from "../../utils/google-error";
import { createLogger } from "../../utils/logger";

const log = createLogger("sheets");

/** Columns A..R, matching HEADER_ROW. */
const LAST_COLUMN = "R";

interface SheetProperties {
  sheetId?: number;
  title?: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

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
      const sheet = await this.findSheet((props) => props.title === this.sheetName);
      if (!sheet) return { valid: true, needsSheetCreation: true };

      // The sheet exists — if it holds data, make sure it is one of ours
      const firstCell = (await this.readRange(`A1:A1`))[0]?.[0];
      if (firstCell && firstCell !== HEADER_ROW[0]) {
        return {
          valid: false,
          error: `The "${this.sheetName}" sheet doesn't look like a PWS Applications sheet — expected column A to be "${HEADER_ROW[0]}", found "${firstCell}". Please select the correct spreadsheet.`,
        };
      }
      return { valid: true };
    } catch (err) {
      log.error("Spreadsheet validation failed:", err);
      return { valid: false, error: describeGoogleError(err) };
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
    const rows = await this.readRange(`A:${LAST_COLUMN}`);
    if (rows.length <= 1) return [];
    return rows.slice(1).map(rowToApplication);
  }

  async writeAll(applications: Application[]): Promise<void> {
    const allRows = [HEADER_ROW, ...applications.map(applicationToRow)];
    const endRow = allRows.length;

    // History lives as JSON in column R; a past bug blanked it on write, so
    // flag anything going out empty before it overwrites good remote data.
    const missingHistory = applications
      .filter((app) => (app.history ?? []).length === 0)
      .map((app) => app.id);
    if (missingHistory.length > 0) {
      log.warn("Writing applications with no history:", missingHistory);
    }

    // RAW keeps Sheets from reinterpreting the JSON history column
    await this.writeRange(`A1:${LAST_COLUMN}${endRow}`, allRows);
    log.debug("Wrote", applications.length, "applications to the spreadsheet");

    // Drop rows left over from a previously longer data set
    const sheet = await this.findSheet((props) => props.title === this.sheetName);
    const sheetId = sheet?.sheetId ?? 0;
    const totalRows = sheet?.gridProperties?.rowCount ?? 0;
    if (totalRows <= endRow) return;

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

  /** Look up a sheet's properties within the spreadsheet. */
  private async findSheet(
    predicate: (props: SheetProperties) => boolean,
  ): Promise<SheetProperties | null> {
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const match = (response.result.sheets ?? []).find((sheet) =>
      sheet.properties ? predicate(sheet.properties) : false,
    );
    return match?.properties ?? null;
  }

  private async readRange(range: string): Promise<string[][]> {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!${range}`,
    });
    return response.result.values ?? [];
  }

  private async writeRange(range: string, values: string[][]): Promise<void> {
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!${range}`,
      valueInputOption: "RAW",
      resource: { values },
    });
  }

  /**
   * Write the header if it is missing, wrong, or shorter than expected — the
   * last case covers sheets created before the History column existed.
   */
  private async ensureHeaderRow(): Promise<void> {
    const firstRow = (await this.readRange(`A1:${LAST_COLUMN}1`))[0];
    const needsUpdate =
      !firstRow ||
      firstRow[0] !== HEADER_ROW[0] ||
      firstRow.length < HEADER_ROW.length;
    if (needsUpdate) {
      await this.writeRange(`A1:${LAST_COLUMN}1`, [HEADER_ROW]);
    }
  }
}
