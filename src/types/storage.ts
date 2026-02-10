import type { Application, ApplicationFormData } from "./application";

export interface StorageConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface StorageService {
  configure(config: StorageConfig): void;
  isConfigured(): boolean;
  getAll(): Promise<Application[]>;
  create(data: ApplicationFormData): Promise<Application>;
  update(id: string, data: Partial<Application>): Promise<Application>;
  delete(id: string): Promise<void>;
}
