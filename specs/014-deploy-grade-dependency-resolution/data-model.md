# Data Model: Deploy-Grade Dependency Resolution

**Feature**: 014-deploy-grade-dependency-resolution  
**Date**: 2026-03-25

## Entities

### 1. PackageReferenceBundle (extended)

Extends the existing entity in `src/compiler/types.ts` and `src/data/packageReferences.ts`.

| Field                     | Type                                                 | Description                                                                                           |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `targetId`                | `"local" \| "testnet:stillness" \| "testnet:utopia"` | Deployment target identifier                                                                          |
| `environmentLabel`        | `string`                                             | Human-readable environment name                                                                       |
| `worldPackageId`          | `string`                                             | On-chain world package address (may be `published-at` for upgraded packages)                          |
| `originalWorldPackageId`  | `string`                                             | Original package ID used for compile-time linking. Equals `worldPackageId` for non-upgraded packages. |
| `objectRegistryId`        | `string`                                             | Object registry address on target network                                                             |
| `serverAddressRegistryId` | `string`                                             | Server address registry on target network                                                             |
| `sourceVersionTag`        | `string`                                             | Upstream `world-contracts` version tag (e.g., `v0.0.18`)                                              |
| `toolchainVersion`        | `string`                                             | Toolchain version used to originally publish the world package                                        |
| `source`                  | `string`                                             | Documentation reference URL                                                                           |
| `lastVerifiedOn`          | `string`                                             | Date of last manual verification                                                                      |

**New fields**: `sourceVersionTag`, `originalWorldPackageId`, `toolchainVersion`

**Relationships**: Used by `WorldSourceFetcher`, `DeployGradeCompiler`, and `TurretAuthorizer`.

### 2. ResolvedWorldSource

New entity. Represents fetched world package source files for a specific version tag.

| Field              | Type                     | Description                                             |
| ------------------ | ------------------------ | ------------------------------------------------------- |
| `sourceVersionTag` | `string`                 | Version tag that was fetched                            |
| `files`            | `Record<string, string>` | File path → content map from `fetchPackageFromGitHub()` |
| `fetchedAt`        | `number`                 | Timestamp of fetch (for staleness checks)               |

**Lifecycle**: Created when deploy-grade compilation is first requested for a target. Cached in memory within the session.

### 3. CachedDependencyResolution

New entity. Represents the cached output of `resolveDependencies()` for reuse across compilations.

| Field                  | Type                   | Description                                                             |
| ---------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `targetId`             | `string`               | Deployment target this resolution is for                                |
| `sourceVersionTag`     | `string`               | World version tag used for resolution                                   |
| `resolvedDependencies` | `ResolvedDependencies` | Opaque builder output (`files`, `dependencies`, `lockfileDependencies`) |
| `resolvedAt`           | `number`               | Timestamp of resolution                                                 |

**Validation rule**: Reuse only if `targetId` AND `sourceVersionTag` match current target metadata. Discard otherwise.

**Lifecycle**: Session-scoped (in-memory). Not persisted to localStorage.

### 4. DeployGradeCompileResult

New entity. Output of deploy-grade compilation.

| Field                      | Type           | Description                                       |
| -------------------------- | -------------- | ------------------------------------------------- |
| `modules`                  | `Uint8Array[]` | Compiled bytecode modules                         |
| `dependencies`             | `string[]`     | Hex-encoded on-chain dependency package IDs       |
| `digest`                   | `number[]`     | Blake2b-256 digest of compilation                 |
| `targetId`                 | `string`       | Target this was compiled for                      |
| `sourceVersionTag`         | `string`       | World version tag used                            |
| `builderToolchainVersion`  | `string`       | WASM builder toolchain version used at compile    |
| `compiledAt`               | `number`       | Timestamp                                         |

**Relationships**: Consumed by `publishRemote.ts` for transaction construction.

### 5. PersistedDeploymentState

New entity. Persisted to localStorage for cross-session continuity.

| Field               | Type     | Description                                        |
| ------------------- | -------- | -------------------------------------------------- |
| `version`           | `1`      | Schema version for migration                       |
| `packageId`         | `string` | Published extension package address                |
| `moduleName`        | `string` | Extension module name (e.g., `builder_extensions`) |
| `targetId`          | `string` | Deployment target ID                               |
| `transactionDigest` | `string` | Confirmation transaction digest                    |
| `deployedAt`        | `number` | Timestamp of deployment                            |

**Storage key**: `frontier-flow:deployment`

**Invalidation rules**:

- Discard if stored `moduleName` differs from current artifact's module name
- Discard if stored `targetId` differs from currently selected target
- Discard if schema `version` is unrecognised

### 6. TurretAuthorizationState

Represents per-turret authorization progress during batch processing.

| Field               | Type                                                                   | Description                          |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| `turretId`          | `string`                                                               | On-chain turret object ID            |
| `status`            | `"pending" \| "submitting" \| "confirming" \| "confirmed" \| "failed"` | Current authorization state          |
| `transactionDigest` | `string \| undefined`                                                  | Authorization tx digest if submitted |
| `error`             | `string \| undefined`                                                  | Error message if failed              |

**Lifecycle**: Transient (in-component state during authorization flow).

## State Transitions

### Deployment Lifecycle

```text
idle → resolving → resolved → compiling → compiled → signing → submitting → confirming → deployed
                                                                                          ↓
                                                                                     authorizing
```

### Per-Turret Authorization

```text
pending → submitting → confirming → confirmed
                ↓            ↓
              failed       failed
```

## Storage Summary

| Entity                     | Storage                                          | Scope         |
| -------------------------- | ------------------------------------------------ | ------------- |
| PackageReferenceBundle     | Source code (hardcoded) + localStorage overrides | Permanent     |
| ResolvedWorldSource        | In-memory                                        | Session       |
| CachedDependencyResolution | In-memory                                        | Session       |
| DeployGradeCompileResult   | In-memory                                        | Session       |
| PersistedDeploymentState   | localStorage                                     | Cross-session |
| TurretAuthorizationState   | React component state                            | Transient     |
