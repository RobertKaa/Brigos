import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: environment.VITE_BASE_PATH || "/",
    plugins: [react()],
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
    test: { include: ["src/**/*.test.ts"], environment: "node" },
    build: {
      rollupOptions: {
        output: {
          manualChunks: { pixi: ["pixi.js"] },
        },
      },
    },
  };
});
