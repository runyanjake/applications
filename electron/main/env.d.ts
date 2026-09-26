/**
 * Build-time config. electron-vite loads `.env*` files and inlines `MAIN_VITE_*`
 * variables into the main-process bundle — see .env.electron.example.
 */
interface ImportMetaEnv {
  readonly MAIN_VITE_GOOGLE_CLIENT_ID?: string;
  readonly MAIN_VITE_GOOGLE_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
