import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const appVersion = process.env.npm_package_version ?? "0.0.0";
const basePath = process.env.VITE_BASE_PATH ?? "/";
const appPort = 5179;
const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
};

function getSortedPackages(packages: Record<string, string> | undefined) {
  return Object.entries(packages ?? {})
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, version]) => ({ name, version }));
}

const projectPackages = {
  dependencies: getSortedPackages(packageJson.dependencies),
  devDependencies: getSortedPackages(packageJson.devDependencies),
};

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
    __PROJECT_PACKAGES__: JSON.stringify({
      ...projectPackages,
      totalCount: projectPackages.dependencies.length + projectPackages.devDependencies.length,
    }),
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
