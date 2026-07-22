## 1. Establish the Oxlint configuration

- [x] 1.1 Add temporary migration tooling in an isolated context and run `@oxlint/migrate` with type-aware, nursery, detailed, native-plugin options to seed an explicit `.oxlintrc.json`; do not retain the migrator as a project dependency.
- [x] 1.2 Configure the root schema, `options.typeAware`, global ignore patterns, and explicit rule lists without enabling Oxlint `typeCheck`.
- [x] 1.3 Preserve the application/test scope (`src/**/*.{ts,tsx}`, `tests/**/*.ts`) with browser and Node environments and the config/server scope (`vite.config.ts`, `playwright.config.ts`, `netlify/functions/**/*.ts`) with the Node environment.
- [x] 1.4 Verify that `scripts/**/*.ts`, unrelated root/public JavaScript files, and all existing generated-output paths remain outside the migrated rule set.

## 2. Correct known rule-parity gaps

- [x] 2.1 Preserve the strict type-aware TypeScript rules, including `no-unnecessary-condition`, and explicitly disable core `no-undef` in TypeScript scopes.
- [x] 2.2 Explicitly enable `typescript/strict-boolean-expressions` and record it as a deliberate restoration of documented policy rather than existing preset parity.
- [x] 2.3 Configure `react/rules-of-hooks` as an error, `react/exhaustive-deps` as a warning, and native `react/react-compiler` as an error for the existing React scope.
- [x] 2.4 Configure `react/only-export-components` with `allowConstantExport: true` to retain Vite Fast Refresh semantics.
- [x] 2.5 Preserve the native JSX accessibility rules while removing the unsupported `includeRoles` option from `jsx-a11y/control-has-associated-label`; verify that the configuration loads successfully.
- [x] 2.6 Preserve warning-level complexity 10, depth 4, 100 lines per function with existing counting options, and 4 parameters, and manually restore exclusions for source tests, test helpers, and fixtures.

## 3. Migrate suppressions and remediate findings

- [x] 3.1 Convert the four existing ESLint `complexity` and `max-lines-per-function` directives to equivalent Oxlint directives with unchanged file-level or next-line scope.
- [x] 3.2 Run Oxlint separately against application/tests and config/Netlify scopes, classify findings as parity differences, React Compiler findings, strict-boolean findings, or genuine existing defects, and correct configuration mismatches before changing application behavior.
- [x] 3.3 Remediate `strict-boolean-expressions` findings with explicit nullish, empty-string, zero, or boolean handling rather than blanket suppressions.
- [x] 3.4 Remediate native React Compiler findings where practical; add only narrow, documented exceptions when changing behavior would be unsafe or outside the change.
- [x] 3.5 Confirm the migrated directives suppress only their named maintainability warnings and that unrelated rules remain reportable.

## 4. Switch the repository toolchain

- [x] 4.1 Add compatible `oxlint` and `oxlint-tsgolint` development dependencies and change the existing `lint` script implementation to `oxlint .` without renaming the script.
- [x] 4.2 Remove `eslint.config.js` and the ESLint, `@eslint/js`, typescript-eslint, `globals`, React Hooks, React Refresh, and JSX accessibility ESLint dependencies after the Oxlint configuration passes.
- [x] 4.3 Regenerate `bun.lock` with Bun and verify that ESLint/typescript-eslint parser packages are no longer retained transitively for repository linting; leave `deno.lock` unchanged unless the active package workflow updates it.
- [x] 4.4 Update the GitHub Actions lint step label from ESLint to Oxlint while preserving the `bun run lint` command and required-job structure.
- [x] 4.5 Verify that pre-commit hooks, `verify`, `verify:full`, verification helper scripts, and VS Code tasks still call the package-level `lint` script and require no tool-specific invocation changes.

## 5. Align policy and contributor documentation

- [x] 5.1 Add a new accepted ADR that supersedes ADR-006 and records the Oxlint/type-aware architecture, React Compiler aggregate decision, strict-boolean restoration, JSX `includeRoles` limitation, separate typecheck gate, and rollback requirement.
- [x] 5.2 Update `.specify/memory/constitution.md` to identify the TypeScript 7 and Oxlint-based policy while preserving the normative promise, unsafe-operation, strict-boolean, and accessibility protections.
- [x] 5.3 Update `CONTRIBUTING.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/HLD.md`, `docs/SOLUTION-DESIGN.md`, and `docs/TESTING-STRATEGY.md` so active guidance consistently describes `bun run lint` as Oxlint-backed.
- [x] 5.4 Confirm historical files under `specs/001-project-workspace-init/` and ADR-006 remain unchanged except for an explicit supersession reference if the ADR index or convention requires one.

## 6. Validate the quality gates

- [x] 6.1 From a clean dependency state, run `bun install --frozen-lockfile` and `bun run lint`; confirm errors fail, warnings remain non-blocking, every intended scope is analyzed, and ignored/generated paths are skipped.
- [x] 6.2 Verify representative promise, unsafe-type, strict-boolean, Hooks, exhaustive-deps, React Compiler, Fast Refresh, JSX accessibility, and maintainability cases through existing code findings or temporary fixtures that are removed after validation.
- [x] 6.3 Run `bun run typecheck` independently and confirm the script, CI job, and pre-commit gate still use `tsc -b` rather than Oxlint type checking.
- [x] 6.4 Run `bun run test:run`, `bun run build`, and `bun run verify:full`, resolving migration-caused failures without weakening unrelated quality gates.
- [x] 6.5 Run OpenSpec validation for `replace-eslint-with-oxlint` and review the final diff for accidental lint-scope expansion, broad suppressions, stale active ESLint guidance, or unrelated Dependabot changes.
