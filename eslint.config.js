import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "build", "coverage", "playwright-report", "test-results", "node_modules", "node-compile-cache", "playwright-transform-cache*"]),
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/__tests__/**", "src/test/**", "src/__fixtures__/**"],
    rules: {
      complexity: ["warn", 10],
      "max-depth": ["warn", 4],
      "max-lines-per-function": ["warn", {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      }],
      "max-params": ["warn", 4],
    },
  },
  {
    files: ["vite.config.ts", "playwright.config.ts"],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
