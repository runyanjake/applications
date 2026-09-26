import { app } from "electron";
import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readdirSync,
  unlinkSync,
  statSync,
  renameSync,
} from "fs";
import { join } from "path";

export interface LogEvent {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  event?: string;
  message: string;
  data?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export class FileLogger {
  private logDir: string;
  private currentFile: string;
  private maxFiles = 7; // Keep 7 days of logs
  private maxFileSize = 10 * 1024 * 1024; // 10MB per file

  constructor() {
    this.logDir = join(app.getPath("userData"), "logs");
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    this.currentFile = this.getLogFileName();
    this.rotateOldLogs();
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split("T")[0];
    return join(this.logDir, `app-${date}.log`);
  }

  private rotateOldLogs(): void {
    const files = readdirSync(this.logDir)
      .filter((f) => f.startsWith("app-") && f.endsWith(".log"))
      .map((f) => ({ name: f, path: join(this.logDir, f) }))
      .sort((a, b) => b.name.localeCompare(a.name));

    // Remove files beyond maxFiles
    files.slice(this.maxFiles).forEach((f) => {
      try {
        unlinkSync(f.path);
      } catch {
        // Ignore deletion errors
      }
    });
  }

  log(events: LogEvent[]): void {
    const newFile = this.getLogFileName();
    if (newFile !== this.currentFile) {
      this.currentFile = newFile;
      this.rotateOldLogs();
    }

    // Check file size and rotate if needed
    if (existsSync(this.currentFile)) {
      const stats = statSync(this.currentFile);
      if (stats.size > this.maxFileSize) {
        const timestamp = Date.now();
        const rotatedName = this.currentFile.replace(
          ".log",
          `-${timestamp}.log`
        );
        renameSync(this.currentFile, rotatedName);
      }
    }

    const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    appendFileSync(this.currentFile, lines, "utf-8");
  }

  getLogPath(): string {
    return this.logDir;
  }
}
