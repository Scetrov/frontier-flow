import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const appVersion = process.env.npm_package_version ?? "0.0.0";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
