# ADR 6: Adopt ESLint 10 with Modern Rulesets

## Context

ESLint 10, released 6 February 2026, removes the legacy `.eslintrc` system entirely, making flat config the only supported format. It also introduces a revised configuration-file lookup algorithm that searches upward from each linted file rather than from the current working directory, which is better suited to monorepo structures we may adopt in the future. The release adds enhanced JSX reference tracking that eliminates false-positive "defined but never used" reports for custom React components, includes built-in TypeScript definitions for Espree and ESLint Scope (removing the need for external `@types` packages), and ships an updated `eslint:recommended` configuration that reflects current best practices. Node.js v20.19.0 or later is required, which aligns with our existing Node.js 24 runtime target.

Additionally, the initial configuration specifies `ecmaVersion: 2020`, which would prevent the linter from understanding syntax features introduced in ES2021 through ES2025 — such as logical assignment operators, top-level await, `Array.findLast`, and the `using` declaration. Setting `ecmaVersion: "latest"` from the outset will allow ESLint to parse the full range of modern JavaScript syntax and apply its rules accurately.

The project also lacks `eslint-plugin-jsx-a11y`, a widely used plugin that catches accessibility violations in JSX at lint time. Because Frontier Flow's UI is a node-based editor with significant interactive complexity, automated accessibility checks would catch missing ARIA attributes, invalid roles, and unlabelled interactive elements before they reach code review.

## Decision

We will upgrade ESLint from ^9.39.1 to ^10.0.0 and adopt the following configuration changes. First, `ecmaVersion` will be set to `"latest"` to enable parsing of all current ECMAScript syntax. Second, we will add `eslint-plugin-jsx-a11y` as a dev dependency and extend its recommended configuration to enforce accessibility rules across all TSX files. Third, we will adopt `typescript-eslint`'s `strictTypeChecked` preset in place of the basic `recommended` preset, enabling type-aware rules such as `no-floating-promises`, `no-misused-promises`, and `strict-boolean-expressions` that catch real bugs the current configuration misses. Fourth, we will configure the `languageOptions.parserOptions` to enable project-level type information so that the strict type-checked rules can function.

The updated `eslint.config.js` will look substantially like:

```js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
```

## Status

Accepted.

## Consequences

Upgrading to ESLint 10 removes all compatibility shims for the legacy `.eslintrc` system, simplifying internal tooling and aligning the project with the only supported configuration format going forward. The upward file-search algorithm future-proofs configuration resolution for a potential monorepo layout. Enhanced JSX reference tracking eliminates spurious unused-variable warnings on custom components, reducing developer friction. Built-in TypeScript definitions for Espree and ESLint Scope remove two `@types` dev dependencies.

Adopting `strictTypeChecked` in place of `recommended` will surface additional lint errors — particularly around unhandled promises, boolean coercions, and unsafe `any` usage. A triage effort will be required to fix or selectively suppress these findings as the codebase develops. Adding `eslint-plugin-jsx-a11y` will similarly flag accessibility gaps, which must be addressed as they arise.

Setting `ecmaVersion` to `"latest"` ensures the linter keeps pace with new syntax automatically, at the minor cost of no longer pinning a specific language version. Enabling `projectService` for type-aware linting may increase lint execution time due to TypeScript program construction; this can be mitigated by constraining the set of type-checked files and by leveraging ESLint's built-in caching (`--cache` flag) in CI.
