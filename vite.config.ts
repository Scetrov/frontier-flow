import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const appVersion = process.env.npm_package_version ?? "0.0.0";
const basePath = process.env.VITE_BASE_PATH ?? "/";
const appPort = 5179;

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: appPort,
  },
  preview: {
    port: appPort,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("@xyflow/react") || id.includes("dagre")) {
            return "flow-vendor";
          }

          if (id.includes("@mysten/dapp-kit") || id.includes("@mysten/sui") || id.includes("@tanstack/react-query")) {
            return "wallet-vendor";
          }

          if (id.includes("highlight.js")) {
            return "code-vendor";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@zktx.io/sui-move-builder/lite": fileURLToPath(
        new URL("./node_modules/@zktx.io/sui-move-builder/dist/lite/index.js", import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    exclude: ["@zktx.io/sui-move-builder", "@zktx.io/sui-move-builder/lite"],
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/bunx-*/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/test/**",
        "src/__fixtures__/**",
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
