import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

/**
 * The desktop renderer loads no remote code: sign-in and LLM requests run in
 * the main process, and Sheets and Drive are called over plain fetch.
 * index.html's CSP also allows the browser build's Google scripts, so
 * tighten it for Electron.
 */
const ELECTRON_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://sheets.googleapis.com https://www.googleapis.com",
  "img-src 'self' data: https:",
  "frame-src 'none'",
  "object-src 'none'",
].join("; ");

function electronCsp(): Plugin {
  const pattern = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/;
  return {
    name: "electron-csp",
    transformIndexHtml(html) {
      if (!pattern.test(html)) {
        throw new Error("electron-csp: no Content-Security-Policy meta tag in index.html");
      }
      return html.replace(pattern, `$1${ELECTRON_CSP}$2`);
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main/index.ts"),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/preload/index.ts"),
        },
        // Sandboxed preloads can't be ES modules; emit CommonJS as .cjs so the
        // package's "type": "module" doesn't reinterpret them.
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
        },
      },
    },
  },
  renderer: {
    root: ".",
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
        output: {
          manualChunks: {
            echarts: ["echarts", "echarts-for-react"],
            react: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
    plugins: [react(), tailwindcss(), electronCsp()],
  },
});
