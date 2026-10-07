## Why

The committed Bun lockfile resolves `source-map-js@1.2.1`, which is inside the affected range for [GHSA-68fv-2mgg-jv7q](https://osv.dev/vulnerability/GHSA-68fv-2mgg-jv7q) (CVE-2026-93749), a high-severity event-loop denial-of-service in indexed source-map parsing. The fix is released, but the repository has no local OSV-Scanner gate that would have blocked this resolution before commit.

## What Changes

- Resolve every Bun occurrence of `source-map-js` to a verified release at version 1.2.2 or a later compatible release outside the advisory range, with registry integrity recorded in `bun.lock`.
- Add a bounded regression that exercises the installed package's indexed-source-map validation without constructing an event-loop-exhausting input.
- Add an always-on local pre-commit hook that runs OSV-Scanner against repository source/lockfiles and fails closed on this advisory.
- Keep OSV-Scanner out of GitHub Actions and other CI jobs. Existing CI `npm-audit` behavior remains unchanged.
- Preserve all current pre-commit hooks; do not disable signing, build, lint, typecheck, audit, or tests.

## Capabilities

### New Capabilities

- `source-map-js-advisory`: Remediation and regression coverage for GHSA-68fv-2mgg-jv7q, plus the local-only OSV-Scanner pre-commit gate.

### Modified Capabilities

None. Existing `dependency-security` requirements remain in force and are not rewritten by this change.

## Impact

- `package.json` overrides and `bun.lock` if an override or lockfile refresh is required for `@tailwindcss/node`, `css-tree`, `magicast`, and `postcss` consumers.
- `.pre-commit-config.yaml` gains a pinned OSV-Scanner hook on the `pre-commit` stage only.
- A small security regression script and its invocation from the existing security test command.
- Contributor/security documentation for the local scanner, its pinned revision, and the explicit non-CI scope.
- No application runtime feature, graph format, CI workflow, or deployment configuration change is intended.
