## Why

OSV-Scanner reports seven vulnerabilities in the committed Bun graph: four in fast-uri 3.1.8 and three in undici 8.12.1. Remove those vulnerable resolutions without changing application behavior.

## What Changes

- Upgrade the fast-uri override to the latest 3.x patch and pin undici to the latest compatible 8.x patch.
- Regenerate Bun integrity hashes and add behavioral regression coverage through the actual consumers.
- Verify all seven findings disappear and existing quality gates pass.
- Integrate pre-commit with the existing Husky hook path, as requested after native installation refused that configuration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dependency-security`: Update patched-version requirements and extend URI and HTTP security regression coverage.

## Impact

`package.json`, `bun.lock`, security regression scripts, `.husky/pre-commit`, and dependency-security specification. Affected dependency paths are commitlint → Ajv → fast-uri and jsdom → undici; no application API changes.
