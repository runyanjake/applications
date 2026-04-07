import type { Application } from "./application";

export interface StorageConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface ValidationResult {
  valid: boolean;
  needsSheetCreation?: boolean;
  error?: string;
}

export interface StorageService {
  configure(config: StorageConfig): void;
  isConfigured(): boolean;
  validateStructure(): Promise<ValidationResult>;
  createApplicationsSheet(): Promise<void>;
  getAll(): Promise<Application[]>;
  writeAll(applications: Application[]): Promise<void>;
}
