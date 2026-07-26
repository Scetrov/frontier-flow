## Why

Frontier Flow's checked-in Stillness references predate the replacement World package now published upstream, while its best-effort browser refresh can combine the new package identity with old registry objects, source, and cache metadata. World package references need to be maintained as an atomic, verifiable bundle so remote compilation and transactions cannot silently target incompatible package lineages.

## What Changes

- Replace the complete Stillness package-reference bundle with the current replacement package, its new registries, matching toolchain metadata, and source tag; re-verify Utopia without changing its still-current package lineage.
- Align the deploy-grade cache manifest and checked-in Stillness resolution snapshot with the source tag corresponding to the replacement deployment.
- Prevent remotely refreshed `Published.toml` metadata from creating a partially updated active deployment bundle; upstream drift instead makes the affected target visibly stale and unavailable until a complete checked-in bundle is verified.
- Add a reusable validation command that compares checked-in Stillness and Utopia identities with upstream `Published.toml`, verifies source-tag and cache alignment, and checks package/registry coherence on Sui testnet.
- Add a least-privilege, SHA-pinned weekly GitHub Actions workflow, with manual dispatch, that runs the validation command and reports actionable drift without modifying the repository.
- Add an operator runbook explaining upgrade versus replacement semantics, authoritative data sources, atomic update steps, source-tag selection, cache regeneration, on-chain verification, testing, and rollback.

## Capabilities

### New Capabilities
- `world-package-reference-integrity`: Defines atomic Stillness/Utopia package-reference bundles, safe upstream drift handling, repeatable maintenance guidance, and scheduled integrity validation.

### Modified Capabilities

None.

## Impact

- Package metadata and runtime resolution in `src/data/packageReferences.ts`, including consumers and tests that currently rely on partial browser overrides.
- Deploy-grade cache configuration in `scripts/deploy-cache-packages.json` and the corresponding generated snapshot under `public/deploy-grade-resolution-snapshots/`.
- New repository validation script and unit tests; `package.json` gains a local command for running the check.
- New scheduled workflow under `.github/workflows/`, using external GitHub and Sui testnet endpoints with read-only repository permissions.
- Deployment and dependency-resolution documentation plus a new World package reference maintenance runbook.
- No user-facing API or dependency upgrade is required; remote deployment for a target may be blocked when upstream identity drift is detected rather than proceeding with mixed metadata.
