## Context

The manifest and Bun lockfile force fast-uri 3.1.6 through Ajv used by Commitlint. All three OSV advisories affect this version. The registry identifies 3.1.8 as the latest 3.x release (tag `three`); 4.2.1 is latest overall but falls outside Ajv's declared ^3.0.1 range.

## Goals / Non-Goals

**Goals:** Remove the reported vulnerable resolution, preserve integrity verification, and protect against regressions with runnable tests.

**Non-Goals:** Major dependency upgrades or claims that these tooling vulnerabilities are reachable in the deployed app.

## Decisions

- Update the existing override to exact 3.1.8, rather than force an incompatible major or remove the security pin. Bun records registry SHA-512 integrity.
- Use Node's built-in test runner for a standalone test script. Resolve fast-uri relative to Ajv via Commitlint's config-validator, avoiding a new direct dependency and testing the actual consumer resolution.
- Run identical tests against integrity-verified 3.1.6 and 3.1.8 packages in network-disabled Podman containers using a digest-pinned Node image. Query OSV for locked packages after the update.

## Risks / Trade-offs

- [Stale node_modules can hide locked behavior] → Reproduce with verified registry tarballs and reinstall from the frozen lockfile.
- [Regression tests depend on the tooling dependency chain] → Resolve from its actual consumer and fail if that dependency cannot be found.
- [Scanning services require network access] → Record service results separately from local behavior tests.

## Migration Plan

Regenerate bun.lock, install with --frozen-lockfile, run security regressions and project quality checks, archive the change, and submit a signed PR. Do not roll back to an affected version.

## Open Questions

None.
