# Remediation evidence

## Baseline and finding disposition

- Branch: `fix/remediate-main-semgrep-findings`, created from freshly fetched `origin/main` at `30c9435007ae47a9ecaa9ee819678037f557e211`.
- Reviewed scan: `931599aa58838cf99e14a1542c22edd41e4779f3`.
- The integrity workflow is unchanged between the scanned revision and implementation baseline.
- The scanned `getNestedValue` read-only traversal in `src/hooks/useAuthorizationContracts.ts` has been removed by the authorization discovery rewrite already on current main. The `prototype-pollution-loop` finding is resolved by removal; no traversal is recreated and no suppression is added to unrelated authorization code.
- Rule-specific annotations cover only the fixed, test-authored button-label regex and the text-node HTML encoder. The encoder's replacement order and behavior remain unchanged.
- Semgrep is not installed locally. The annotations retain the reported rule IDs; scanner acceptance and any Cloud namespace requirements are not locally verified.
- The generic OAuth Logic Flaw finding remains open; this change neither patches nor suppresses it.

## Reproduction

Used isolated, network-disabled Podman containers with `docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c` (Node 24.16.0) and the existing installed dependencies.

- The baseline workflow executed `$(touch /tmp/injection-marker)` embedded in a ref when GitHub expressions were substituted into shell source.
- The baseline manifest regex matched `worldX` for a `world.` directory and threw for an unbalanced `world[` directory.
- The new compiler regression passed its mixed-case case but failed all three metacharacter cases against baseline production code (two decoy matches and one regex exception).
- After literal comparison, all 18 compiler unit tests pass.
- After environment-based summary rendering, all five workflow tests pass, including hostile ref text, a summary filename with spaces, and success/failure/skipped outcomes.

## Scope and final validation

- Affected suites in network-disabled Podman: **104 passed, 1 skipped**, across 14 passing files and one skipped file. Includes workflow, deploy-grade compiler, CompilationStatus, MoveSourcePanel, authorization discovery/transactions/hooks, GitHub callback, and popup bridge.
- Full Vitest suite in the same container: **814 passed, 1 skipped**, across 113 passing files and one skipped file. The live deploy-grade integration test skips without `GITHUB_TOKEN`/`GH_TOKEN`; no live-builder verification is claimed.
- Final compiler rerun after tightening the test mock types: **18 passed**.
- `bun run test:security`: **8 passed**.
- `bun run typecheck`: passed.
- `bun run lint`: passed with the pre-existing `useGraphTransfer.ts:245` exhaustive-deps warning; no new lint errors remain.
- `git diff --check`: passed.
- Compared the final changed-file set with `origin/main`: OAuth callback, state/cookie/token code, popup bridge, and authorization discovery are unchanged. The only source-code suppression rules are `detect-non-literal-regexp` and `detect-replaceall-sanitization`; no Logic Flaw suppression was introduced.
- No dependency manifest/lockfile, global Semgrep ignore, path exclusion, rule configuration, or sanitization dependency was changed or added.
- Dependabot content matches baseline exactly after replacing both `default-days: 5` entries with `default-days: 7`; schedules, limits, and groups are preserved.
- Before committing, synced delta requirements to the main specs and archived the completed change on 2026-10-07. With user approval, corrected the two existing main specs' delta-only headings to valid Purpose/Requirements sections without altering their existing requirement content.
- `pre-commit run --all-files`: all six configured pre-commit checks passed (OSV scanner, build, lint, typecheck, dependency audit, and unit/security tests). The pre-commit hook is installed.
