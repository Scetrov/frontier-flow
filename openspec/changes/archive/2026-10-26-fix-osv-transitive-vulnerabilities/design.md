## Context

A baseline `osv-scanner scan source --lockfile=bun.lock` reproduces exactly the seven reported advisories. Ajv uses fast-uri 3.1.8; jsdom uses undici 8.12.1. The npm registry identifies 3.1.9 as the latest fast-uri 3.x release and 8.12.3 as the latest undici 8.x release.

## Goals / Non-Goals

**Goals:** Remove all seven vulnerable resolutions, retain reproducible integrity-pinned installs, and exercise security behavior through actual consumer dependencies.

**Non-Goals:** Upgrade dependency major versions, change application networking, or suppress scanner findings.

## Decisions

- Set exact overrides for fast-uri 3.1.9 and undici 8.12.3, rather than upgrading unrelated parent dependencies. Both satisfy consumer semver ranges; retain registry SHA-512 integrity in Bun's generated lockfile.
- Extend the existing Ajv-resolved fast-uri suite for suffix scheme injection, encoded schemes, malformed hosts, and relative-reference equivalence.
- Add jsdom-resolved undici tests for bounded EventSource parser state, mixed-case SRI rejection, and excessive-content-encoding error handling. Resolve the real consumer package, not an unrelated hoisted copy; isolate crash-sensitive checks in child processes with timeouts.
- Preserve Husky's existing `core.hooksPath` and commit-message hook. Add `.husky/pre-commit` to invoke the configured pre-commit stage and fail explicitly if pre-commit is missing; the operator approved this integration after `pre-commit install` refused the existing hook path.
- Use the OSV scan as the exact advisory regression signal and run existing build/lint/typecheck/audit/test gates. Attempt container validation using the repository's digest-pinned Bun image.

## Risks / Trade-offs

- URI normalization fixes can affect schema references → run application tests and valid-URI controls.
- Undici internal parser API tests are version-coupled → limit internal imports to the parser resource-bound check; use public fetch for HTTP checks.
- Development dependency presence does not prove production exploitability → report resolution exposure without claiming a confirmed application exploit.
