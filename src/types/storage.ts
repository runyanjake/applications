import type { Application } from "./application";

export interface StorageConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface StorageService {
  configure(config: StorageConfig): void;
  isConfigured(): boolean;
  getAll(): Promise<Application[]>;
  writeAll(applications: Application[]): Promise<void>;
}
