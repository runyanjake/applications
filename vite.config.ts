import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      // `npm run logs` runs the sink locally; without it the client transport
      // simply gives up after a few failed posts.
      "/api/logs": { target: "http://127.0.0.1:8080" },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // ECharts is by far the largest dependency and only the analytics and
        // report pages need it — keep it out of the entry chunk.
        manualChunks: {
          echarts: ["echarts", "echarts-for-react"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
