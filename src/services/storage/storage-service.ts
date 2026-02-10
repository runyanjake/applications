import type { StorageService } from "../../types/storage";
import { GoogleSheetsService } from "./google-sheets-service";

export function createStorageService(): StorageService {
  return new GoogleSheetsService();
}
