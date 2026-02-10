import type { AuthService } from "../../types/auth";
import { GoogleAuthService } from "./google-auth-service";

export function createAuthService(): AuthService {
  return new GoogleAuthService();
}
