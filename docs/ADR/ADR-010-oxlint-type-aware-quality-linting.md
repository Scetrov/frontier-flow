# ADR 10: Adopt Oxlint with Type-Aware Quality Linting

## Supersedes

ADR-006 (ESLint 10 with Modern Rulesets) — retained as historical context.

## Context

The TypeScript 7 upgrade caused ESLint's parser stack (`@typescript-eslint/typescript-estree`) to crash because the installed typescript-eslint release only supports TypeScript versions below 6. TypeScript 7 removed internal APIs that the parser depended on. Replacing the incompatible parser stack with Oxlint and its TypeScript 7-native type-aware engine (`oxlint-tsgolint`) restores the CI quality gate while retaining the repository's lint protections and reducing future coupling to unsupported TypeScript internals.

## Decision

### Oxlint with native type-aware engine

Add `oxlint` and `oxlint-tsgolint` as development dependencies. The `lint` script remains named `lint` and invokes `oxlint .`. Type-aware analysis is enabled via `options.typeAware: true` in `.oxlintrc.json`. The complete TypeScript compiler diagnostics remain in the separate `tsc -b` gate (`bun run typecheck`).

### Explicit audited configuration

Create `.oxlintrc.json` with an explicit rule list that preserves parity with the previous ESLint/`strictTypeChecked` preset. The configuration uses the `correctness` category as the base (matching `eslint:recommended`) and explicitly enables all type-aware TypeScript, React, and JSX accessibility rules.

### React Compiler aggregate

Replace the fifteen individual compiler-backed React Hooks plugin rules with Oxlint's native `react/react-compiler` rule. This executes React Compiler lint analysis natively without relying on the alpha JavaScript plugin API. `react/rules-of-hooks` remains an error, `react/exhaustive-deps` remains a warning.

### Vite Fast Refresh semantics

`react/only-export-components` is configured with `allowConstantExport: true`, matching the existing Vite Fast Refresh preset semantics.

### Strict boolean policy restoration

`typescript/strict-boolean-expressions` is explicitly enabled. The previous constitution and ADR-006 documented this rule as part of the `strictTypeChecked` preset's safety intent, but the installed preset version did not actually enable it. This change restores the documented policy.

### JSX accessibility `includeRoles` limitation

The native `jsx-a11y/control-has-associated-label` rule does not support the `includeRoles` option that the ESLint plugin provided. The rule's supported recommended options are preserved. This means the `alert` and `dialog` role extensions are not enforced at lint time. Playwright Axe E2E audits remain the runtime accessibility backstop. The `jsx-a11y/prefer-tag-over-role` rule is not enabled because it was not part of the previous ESLint jsx-a11y recommended set.

### Separate typecheck gate

Complete TypeScript compiler diagnostics remain in `tsc -b`. Oxlint's `typeCheck` option is not enabled. Type-aware lint rules and complete compiler diagnostics are complementary.

### Rollback requirement

Reverting the migration requires reverting the migration commit and, if the original motivation was the TypeScript 7 upgrade, pinning TypeScript to a typescript-eslint-supported release (5.9.x). Restoring ESLint while retaining TypeScript 7 is not a valid rollback state.

## Status

Accepted.

## Consequences

- Removes ESLint, `@eslint/js`, typescript-eslint, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `eslint-plugin-jsx-a11y` from the dependency tree.
- Adds `oxlint` and `oxlint-tsgolint`.
- Reduces CI lint execution time (Oxlint is written in Rust and processes files in parallel).
- Eliminates the parser compatibility boundary that blocked the TypeScript 7 upgrade.
- The React Compiler aggregate rule changes diagnostic identifiers and severity granularity from fifteen individual rules to one aggregate rule; new findings are triaged as part of migration.
- The narrow `includeRoles` JSX accessibility option difference reduces one edge case of author-time detection; runtime Axe E2E audits remain the backstop.
- The documented strict boolean policy is now actually enforced, surfacing findings that were previously undetected.
