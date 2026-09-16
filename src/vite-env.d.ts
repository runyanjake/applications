/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}

/** Runtime config served as /config.js — see public/config.js and nginx.conf. */
interface Window {
  __APP_CONFIG__?: { logLevel?: string };
}
