## Why

OSV-Scanner reports high-severity denial-of-service advisories for transitive `js-yaml` and `nanoid` releases currently resolved by the project. Updating their resolutions is needed to remove known vulnerable code from development and build tooling.

## What Changes

- Update the dependency overrides and Bun lockfile to resolve `js-yaml` to a fixed 4.x release.
- Update the dependency overrides and Bun lockfile to resolve `nanoid` to a fixed 3.x release compatible with its current dependents.
- Validate the resolved dependency graph and project quality gates.

## Capabilities

### New Capabilities

- `dependency-security`: Secure resolution requirements for dependencies identified by vulnerability scanning.

### Modified Capabilities

None.

## Impact

- `package.json` dependency overrides and `bun.lock` resolved package integrity entries.
- Transitive dependencies of Commitlint and PostCSS-based build tooling.
- No application APIs or runtime product behavior change.
