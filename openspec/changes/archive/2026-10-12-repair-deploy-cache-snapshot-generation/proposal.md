## Why

`bun run scripts/preload-deploy-cache.ts` cannot regenerate any deploy-grade resolution snapshot. It fails before the network is reached with `StructuredBuildError: Dependency cycle detected: starter_contract -> starter_contract`, and after that is resolved with `Move.lock V4 package 'starter_contract' has duplicate named address 'world'`.

Both failures reproduce against the snapshot entries already checked in, including `v0.0.24`, so this is not caused by any pending bundle change. The script builds a throwaway root package to resolve the pinned `world` dependency, and that synthetic package is self-inconsistent in two ways that newer `@zktx.io/sui-move-builder` releases reject.

Deploy-cache regeneration is step 6 of the World Package Reference Maintenance Runbook. While it fails, the `deploy-cache` validation layer cannot be re-established for any target after an upstream republication.

## What Changes

- Stop describing the synthetic root package with `rootGit`. The root is a local package; pointing it at the same git/rev/subdir triple as its own `world` dependency makes it its own dependency.
- Stop declaring a `world` named address in the synthetic `Move.toml`. `world` is already the dependency name, and Move.lock V4 rejects the collision.
- Export `createSyntheticFiles` and the new `createDependencyResolutionRequest` so both behaviours are reachable from tests.
- Guard the CLI entrypoint with `import.meta.main`, matching `scripts/check-world-package-references.ts`, so importing the module does not start a resolution run.
- Add regression coverage asserting the synthetic manifest pins the requested revision, declares no colliding named address, and resolves the root as a local package.

## Capabilities

### Modified Capabilities

- `world-package-reference-integrity`: restores the ability to regenerate the deploy-grade resolution snapshots this capability validates. Verification semantics, bundle contents, and source provenance rules are unchanged.

### New Capabilities

None.

## Impact

- `scripts/preload-deploy-cache.ts` and a new `src/__tests__/preload-deploy-cache.test.ts`.
- No checked-in snapshot, bundle, manifest, or `scripts/deploy-cache-packages.json` entry is modified by this change. Regenerating snapshots remains a separate, reviewed action.
- No application source, graph format, or deployment behaviour is affected.
