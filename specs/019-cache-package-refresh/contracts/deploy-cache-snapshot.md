# 1. Deploy Cache Snapshot Contract

## 1.1 Purpose

This contract defines the JSON artifact shipped under `public/deploy-grade-resolution-snapshots/` and consumed by `src/deployment/dependencySnapshotLoader.ts` plus `src/compiler/deployGradeCompiler.ts`.

## 1.2 Snapshot Shape

```json
{
  "sourceVersionTag": "v0.0.18",
  "resolvedAt": 1774554436357,
  "resolvedDependencies": {
    "files": "{}",
    "dependencies": "[{\"name\":\"MoveStdlib\",\"files\":{...}},{\"name\":\"Sui\",\"files\":{...}},{\"name\":\"World\",\"files\":{...}}]",
    "lockfileDependencies": "{...}"
  }
}
```

## 1.3 Required Runtime Guarantees

- `sourceVersionTag` MUST match the selected target before runtime reuse.
- `resolvedDependencies.dependencies` MUST parse into an array of package snapshots.
- The package array MUST include `MoveStdlib`, `Sui`, and `World` for any supported remote target snapshot.
- Each required package MUST have at least one source file entry.
- The runtime MUST be able to materialize a complete local dependency tree from the snapshot without fetching transitive package sources from GitHub on a cache hit.

## 1.4 Materialization Rules

- Package name matching is case-insensitive.
- The `World` package keeps the existing deploy-grade rewrite behavior for `published-at`, `originalWorldPackageId`, and source sanitization.
- Transitive package payloads such as `MoveStdlib` and `Sui` MUST also be written into the local file tree so the builder can resolve them without live network fetches.
- Test-only files may be dropped if current deploy-grade sanitization rules already exclude them.

## 1.5 Failure Contract

- If the snapshot is missing a required package, the runtime MUST reject it as an incomplete bundled cache.
- If the snapshot cannot be parsed, the runtime MUST not continue as though a cache hit occurred.
- Cache rejection MUST either trigger an explicit fallback to the network-backed path or surface a targeted cache-validation error.