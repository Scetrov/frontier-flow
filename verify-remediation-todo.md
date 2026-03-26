# Verify Remediation Todo

- Status: resolved
- Verification run: typecheck, build, lint, unit tests, Playwright E2E
- Failure found: Playwright E2E strict locator collision in `tests/e2e/deployment-progress.spec.ts`
- Root cause: the shared target selection helper matched `local` against both `local` and `local:evefrontier`
- Fix applied: updated `tests/e2e/fixtures/workflow.ts` to select the deployment target with `exact: true`
- Follow-up verification: chromium and mobile-chrome deployment-progress specs passed after the fix

---

## New verification run — 2026-03-26

- Status: partial-fail
- Checks executed: `typecheck`, `build`, `lint` (collected locally via tasks)
- Failures collected:
  - TypeScript errors in `src/components/DeploymentProgressModal.tsx` and `src/components/LocalEnvironmentSettingsModal.tsx` (unused import, syntax error, prop-type mismatch).
  - ESLint errors: `react-hooks/set-state-in-effect`, `@typescript-eslint/no-unsafe-assignment`, `jsx-a11y/label-has-associated-control`, plus `max-lines-per-function` and complexity warnings.

Suggested safe actions:

- Remove unused imports (automatable).
- Fix the semicolon/syntax error in `LocalEnvironmentSettingsModal.tsx` (automatable).
- Add missing label association for the input in `LocalEnvironmentSettingsModal.tsx` (automatable).

Risky or manual actions required:

- Address `react-hooks/set-state-in-effect` (requires design decision).
- Fix `no-unsafe-assignment` by adding type guards or narrowing `any` usage (requires context).
- Refactor long/complex functions to reduce ESLint complexity warnings (non-trivial).

Next step recommendation: apply the three safe automated fixes, re-run `bun run verify`, and report remaining issues for manual review.
