## Context

The repository currently runs `eslint .` through a stable `bun run lint` script. That script is consumed by GitHub Actions, pre-commit hooks, aggregate verification commands, and a VS Code task. ESLint's flat configuration combines `eslint:recommended`, `typescript-eslint`'s `strictTypeChecked` preset, React Hooks 7 recommended rules, the Vite React Refresh preset, JSX accessibility recommended rules, and four maintainability warnings.

The current Dependabot branch upgrades TypeScript from 6.0.2 to 7.0.2. `typescript-eslint@8.57.0` declares support only below TypeScript 6, and TypeScript 7 removes APIs used by its parser, causing lint startup to fail before any files are checked. Main was already outside the declared compatibility range at TypeScript 6, so reverting only the latest crash would leave the quality gate on an unsupported combination.

Oxlint provides native JavaScript, TypeScript, React, React Hooks, React Refresh, and JSX accessibility rules. Its type-aware integration uses `oxlint-tsgolint`, which is built on the TypeScript 7 native implementation. Repository investigation and an isolated run of `@oxlint/migrate` showed that most rules map directly, but the generated output requires manual correction: nursery rules are omitted unless requested, TypeScript `no-undef` needs explicit handling, override-local test exclusions are lost, React Compiler-backed Hooks rules are skipped, and `jsx-a11y/control-has-associated-label` receives an unsupported `includeRoles` option.

The active constitution and ADR-006 also claim that `strictTypeChecked` enables `strict-boolean-expressions`. The published `typescript-eslint@8.57.0` preset does not actually enable that rule, so this change must reconcile documented policy with observed behavior.

## Goals / Non-Goals

**Goals:**

- Restore a working TypeScript 7-compatible lint quality gate.
- Preserve `bun run lint` as the stable integration contract and preserve its error/warning exit behavior.
- Preserve current linted file scopes, generated-output ignores, environment globals, and production-source maintainability exclusions.
- Preserve or deliberately replace the current core, type-aware TypeScript, React Hooks, Fast Refresh, and JSX accessibility protections.
- Keep complete TypeScript compilation diagnostics in the separate `tsc -b` gate.
- Make all intentional semantic differences visible in configuration, documentation, and validation.
- Remove the unsupported ESLint/typescript-eslint dependency stack after parity is demonstrated.

**Non-Goals:**

- Expanding lint coverage to `scripts/**/*.ts`, root JavaScript configuration files, or `public/github-auth-callback.js`.
- Replacing `tsc -b` with Oxlint type checking.
- Adopting Oxfmt or changing formatting policy.
- Introducing `--deny-warnings`; maintainability findings remain non-blocking warnings.
- Refactoring unrelated application code except where required to satisfy explicitly adopted lint rules.
- Rewriting historical artifacts under `specs/001-project-workspace-init/`.

## Decisions

### Use Oxlint with its native type-aware engine

Add `oxlint` and `oxlint-tsgolint` as development dependencies and configure `options.typeAware: true`. The `lint` script will remain named `lint` and invoke `oxlint .`.

This removes the parser compatibility boundary that caused the failure and aligns type-aware analysis with TypeScript 7. The two type-aware rules not yet implemented by tsgolint, `naming-convention` and `prefer-destructuring`, are not enabled by the current preset and therefore do not create a parity gap.

Alternatives considered:

- Pin TypeScript to 5.9 and retain ESLint. This restores support but abandons the desired current TypeScript toolchain and preserves the slower, more tightly coupled parser stack.
- Run Oxlint and ESLint together. This retains the incompatible parser for type-aware rules and creates duplicate configuration and diagnostics.
- Use Oxlint JavaScript plugins for all existing ESLint plugins. The JS plugin API is still alpha and would retain most of the dependency surface without solving configuration complexity.

### Use an explicit JSON configuration, audited after migration

Create `.oxlintrc.json` with the package-provided schema. Use `@oxlint/migrate` only as a one-time generation aid, with `--type-aware`, `--with-nursery`, `--details`, and native plugins; do not add the migrator as a permanent dependency. Review the resulting explicit rule list rather than relying on Oxlint's broad category defaults.

Explicit rules make parity review possible and avoid silently gaining unrelated rules as category membership changes. The configuration will:

- enable the TypeScript, React, and JSX accessibility plugins only in scopes that currently use them;
- use browser and Node environments for `src` and `tests`, and Node-only environments for Vite, Playwright, and Netlify files;
- retain the existing global ignore patterns;
- retain maintainability thresholds and manually add `excludeFiles` for tests and fixtures;
- disable core `no-undef` in TypeScript scopes, preserving typescript-eslint's current behavior and avoiding false positives for typed Vitest globals;
- retain `typescript/no-unnecessary-condition`, which requires nursery inclusion;
- preserve warning severities for `exhaustive-deps` and the four maintainability rules.

The generated config must successfully load before application findings are triaged. The migrator output is not accepted as implementation-ready by itself.

### Replace compiler-backed React Hooks rules with native React Compiler analysis

Keep native `react/rules-of-hooks` as an error and `react/exhaustive-deps` as a warning. Enable `react/react-compiler` for the same application/test scope to replace the fifteen compiler-backed rules that the migrator cannot map individually.

The aggregate rule is experimental and changes diagnostic identifiers and severity granularity, but it executes React Compiler lint analysis natively and avoids relying on Oxlint's alpha JavaScript plugin compatibility. Any new findings produced by this rule will be triaged as part of migration rather than silently suppressing the rule.

### Preserve Vite Fast Refresh semantics

Configure `react/only-export-components` with `allowConstantExport: true`, matching the existing Vite preset. This keeps constant exports valid while continuing to reject module exports that break Fast Refresh boundaries.

### Accept and document the narrow JSX accessibility option difference

Remove the unsupported `includeRoles` option from native `jsx-a11y/control-has-associated-label` while preserving its supported recommended options. Oxlint's native rule checks interactive elements and roles but cannot reproduce the existing explicit extension to `alert` and `dialog` roles.

This limited author-time difference is accepted because retaining the entire JSX accessibility ESLint plugin through the alpha JS plugin API would add more operational risk than the narrow gap. Existing Playwright Axe audits remain the runtime accessibility backstop. The new ADR and lint policy will state this difference explicitly so it is not mistaken for exact parity.

### Restore the documented strict boolean policy

Explicitly enable `typescript/strict-boolean-expressions` in applicable TypeScript scopes. This follows the constitution and ADR-006's stated safety intent even though the former preset did not actually enforce it. Resulting findings are deliberate migration work and must be corrected or narrowly justified; they are not grounds to omit the rule silently.

Because this strengthens actual enforcement, implementation reporting must distinguish strict-boolean remediation from tool-parity fixes.

### Keep type checking independent

Retain `typecheck: tsc -b`, its dedicated CI job, and the existing pre-commit/typecheck task. Do not enable Oxlint's `typeCheck` option in this change. Type-aware lint rules and complete compiler diagnostics are complementary, and preserving separate commands keeps failures attributable and rollback straightforward.

### Preserve caller contracts and update active documentation

Keep the `lint` script name and all callers. Update user-visible labels such as the CI step from “Run ESLint” to “Run Oxlint,” but avoid unnecessary workflow restructuring.

Add a new ADR that supersedes ADR-006 while retaining ADR-006 as historical context. Update active references in the constitution, contributor guidance, Copilot instructions, pull-request template, HLD, solution design, and testing strategy. Historical project-initialization artifacts remain unchanged.

### Treat lockfiles according to the active Bun toolchain

Regenerate and commit `bun.lock` using the repository's Bun workflow. `deno.lock` is the only tracked Deno artifact and has no active repository references, so it is outside this change unless normal package tooling demonstrably updates it.

## Risks / Trade-offs

- **Experimental React Compiler aggregate may differ from fifteen individual plugin rules** → Validate representative existing violations, review all migration findings, and document the aggregate rule choice in the ADR.
- **The migrator can emit invalid or semantically incomplete configuration** → Use it only to seed an explicit config, enable detailed reporting, manually correct known gaps, and require a successful config-load check before source remediation.
- **Removing `includeRoles` weakens one accessibility edge case** → Preserve all other native JSX accessibility rules, keep Axe E2E audits, and document the exact `alert`/`dialog` limitation.
- **Enabling strict boolean expressions creates new application findings** → Treat remediation as an intentional policy-restoration task, avoid blanket suppressions, and report it separately from parity work.
- **Type-aware resolution may assign files differently from ESLint project service** → Validate every current scope against `tsconfig.app.json` and `tsconfig.node.json`, and do not expand to unowned scripts in this change.
- **Future Oxlint and tsgolint upgrades may drift** → Resolve a tested compatible pair in `bun.lock`, keep them in the existing grouped dependency update process, and require lint validation for upgrades.
- **Warnings or output formatting may differ in CI/editor terminals** → Preserve severities and exit semantics; do not add warning denial or formatter-specific caller assumptions.

## Migration Plan

1. Generate and manually audit the explicit Oxlint configuration in an isolated or working-tree context.
2. Add Oxlint dependencies and change only the implementation behind `bun run lint`.
3. Correct known configuration gaps before evaluating source diagnostics.
4. Convert the four ESLint suppression comments and verify each still targets the intended warning.
5. Run lint by scope, triage parity findings, then remediate the deliberately added strict-boolean and React Compiler findings.
6. Run the independent typecheck, unit tests, build, and full verification commands.
7. Update CI labels and active documentation, add the superseding ADR, and regenerate `bun.lock` with Bun.
8. Remove ESLint configuration and dependencies only after Oxlint passes the full validation set.

Rollback requires reverting the migration commit and pinning TypeScript to a typescript-eslint-supported release (5.9.x). Restoring ESLint while retaining TypeScript 7 is not a valid rollback state.

## Open Questions

None. The implementation must report any additional unsupported rule options or scope differences discovered during final parity validation rather than silently accepting them.
