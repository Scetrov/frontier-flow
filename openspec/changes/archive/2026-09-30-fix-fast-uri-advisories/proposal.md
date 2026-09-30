## Why

OSV reports GHSA-58mr-gqgx-xq4g, GHSA-hrr3-gc8f-f4qj, and GHSA-qw65-cvwx-89v3 against the overridden fast-uri 3.1.6 dependency. These URI parsing and serialization weaknesses need a compatible patched resolution.

## What Changes

- Pin the fast-uri override to 3.1.8 and regenerate Bun's integrity-bearing lockfile.
- Add executable security regression tests for malformed hosts, encoded host case normalization, and port injection.
- Verify the affected and patched packages in isolated containers and recheck OSV.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dependency-security`: Require the patched fast-uri 3.x resolution and regression coverage for the three advisories.

## Impact

Changes package.json, bun.lock, security tests, and dependency-security specifications. fast-uri is transitive through development tooling (Commitlint → Ajv); no direct application use was found. No exploitability of the deployed application is claimed.
