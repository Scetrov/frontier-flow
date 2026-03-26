# Verify Remediation Todo

- Status: resolved
- Verification run: typecheck, build, lint, unit tests, Playwright E2E
- Failure found: Playwright E2E strict locator collision in `tests/e2e/deployment-progress.spec.ts`
- Root cause: the shared target selection helper matched `local` against both `local` and `local:evefrontier`
- Fix applied: updated `tests/e2e/fixtures/workflow.ts` to select the deployment target with `exact: true`
- Follow-up verification: chromium and mobile-chrome deployment-progress specs passed after the fix