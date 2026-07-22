## Why

The TypeScript 7 upgrade causes ESLint to crash inside `@typescript-eslint/typescript-estree` because the installed typescript-eslint release only supports TypeScript versions below 6. Replacing that incompatible parser stack with Oxlint and its TypeScript 7-native type-aware engine restores CI while retaining the repository's lint quality gates and reducing future coupling to unsupported TypeScript internals.

## What Changes

- **BREAKING (developer tooling)**: Replace the ESLint CLI, flat configuration, typescript-eslint parser stack, and ESLint-specific plugins with Oxlint and `oxlint-tsgolint`.
- Preserve `bun run lint` as the stable command used by CI, pre-commit hooks, verification scripts, and editor tasks.
- Preserve existing file coverage, ignore patterns, warning thresholds, type-aware checks, React Hooks checks, Vite Fast Refresh checks, and JSX accessibility checks through an explicitly audited Oxlint configuration.
- Use Oxlint's native React Compiler analysis for the compiler-backed checks currently supplied by the React Hooks recommended preset.
- Keep `tsc -b` as an independent type-check gate rather than folding compiler diagnostics into linting.
- Convert existing ESLint suppression directives to Oxlint directives.
- Resolve known migration differences explicitly: nursery rule selection, TypeScript `no-undef`, production-source maintainability exclusions, and the unsupported JSX accessibility `includeRoles` option.
- Align the documented linting policy and ADRs with the new toolchain, including an explicit decision on `strict-boolean-expressions`.

## Capabilities

### New Capabilities
- `type-aware-quality-linting`: Defines the repository-wide lint command, covered file scopes, type-aware and framework checks, maintainability warnings, suppression behavior, and CI/developer workflow integration provided by Oxlint.

### Modified Capabilities

None.

## Impact

- Affects `package.json`, `bun.lock`, the lint configuration, and four inline lint suppressions.
- Removes ESLint, `@eslint/js`, typescript-eslint, `globals`, and ESLint-specific React/accessibility plugin dependencies; adds Oxlint and `oxlint-tsgolint`.
- Keeps the existing `lint` script contract, so CI, pre-commit, aggregate verification, and VS Code task callers remain structurally stable while their labels/documentation may change.
- Supersedes the tooling decision in `docs/ADR/ADR-006-eslint-10-migration.md` and requires updates to active governance and contributor documentation.
- Does not expand lint coverage to currently uncovered `scripts/**/*.ts` or replace the separate TypeScript build/typecheck process.
