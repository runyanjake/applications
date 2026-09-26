import { safeStorage, app } from "electron";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export class SecureStorage {
  private storagePath: string;

  constructor() {
    this.storagePath = join(app.getPath("userData"), "secure-data");
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  saveTokens(tokens: StoredTokens): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption not available");
    }

    const encrypted = safeStorage.encryptString(JSON.stringify(tokens));
    writeFileSync(join(this.storagePath, "tokens.enc"), encrypted);
  }

  loadTokens(): StoredTokens | null {
    const path = join(this.storagePath, "tokens.enc");
    if (!existsSync(path)) return null;

    try {
      const encrypted = readFileSync(path);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  clearTokens(): void {
    const path = join(this.storagePath, "tokens.enc");
    if (existsSync(path)) {
      // Overwrite before delete for security
      writeFileSync(path, "");
      unlinkSync(path);
    }
  }

  saveUser(user: StoredUser): void {
    // User info is not sensitive, store unencrypted
    writeFileSync(join(this.storagePath, "user.json"), JSON.stringify(user));
  }

  loadUser(): StoredUser | null {
    const path = join(this.storagePath, "user.json");
    if (!existsSync(path)) return null;

    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return null;
    }
  }

  clearUser(): void {
    const path = join(this.storagePath, "user.json");
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
}
