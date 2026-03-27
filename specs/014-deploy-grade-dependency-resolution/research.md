# Research: Deploy-Grade Dependency Resolution

**Feature**: 014-deploy-grade-dependency-resolution  
**Date**: 2026-03-25

## R1. WASM Builder API for Deploy-Grade Compilation

**Decision**: Use `@zktx.io/sui-move-builder` v0.2.8's full `BuildInput` interface — specifically `rootGit`, `resolvedDependencies`, and the `resolveDependencies()` function.

**Rationale**: The builder already exposes every input needed for deploy-grade compilation. The current invocation in `moveCompiler.ts` only passes `files`, `silenceWarnings`, and `network` through a narrowed `MoveCompilerModule` interface. The builder's actual `BuildInput` also accepts `rootGit` (git URL + rev + subdir), `resolvedDependencies` (opaque cached resolution), and `onProgress` (resolution progress events). No upstream changes are required.

**Alternatives considered**:

- Server-side compilation via a dedicated build service — rejected per ADR-009 (deferred unless browser path proves insufficient).
- Using only `Move.lock` without `rootGit` — rejected because the builder needs `rootGit` to resolve the package source identity within the lockfile.

**Key API surface**:

- `buildMovePackage(input: BuildInput): Promise<BuildSuccess | BuildFailure>`
- `resolveDependencies(input: Omit<BuildInput, "resolvedDependencies">): Promise<ResolvedDependencies>`
- `BuildInput.rootGit?: { git: string; rev: string; subdir?: string }`
- `ResolvedDependencies: { files: string; dependencies: string; lockfileDependencies: string }`
- `BuildSuccess.dependencies: string[]` — hex-encoded package IDs (the real dependency list)

## R2. World Package Source Fetching Strategy

**Decision**: Use the builder's built-in `fetchPackageFromGitHub()` function instead of tarball extraction. Then fall back to tarball if CORS or rate-limiting issues arise.

**Rationale**: During research, we discovered that `@zktx.io/sui-move-builder` exports `fetchPackageFromGitHub(url, options)` which returns `Record<string, string>` — a file map of the entire package tree from a GitHub URL. This is exactly what we need and avoids introducing new dependencies (pako, js-untar). The function uses GitHub API tree traversal plus `raw.githubusercontent.com` for file content, which has CORS support.

**Alternatives considered**:

- GitHub tarball archive + in-browser extraction — viable fallback if `fetchPackageFromGitHub()` proves unreliable under rate limits.
- Individual raw.githubusercontent.com fetches per file — rejected due to 37+ files and no batching.
- Pre-bundled JSON manifest per version tag — rejected as too rigid and requires hosting infrastructure.

**Spec FR-008 impact**: The spec mandates tarball fetch + extraction. Research shows the builder's `fetchPackageFromGitHub()` achieves the same goal more simply. The plan will use `fetchPackageFromGitHub()` as the primary path and may note tarball as a fallback option. FR-008's intent (fetch the world subtree in-browser without individual file requests) is preserved.

## R3. Compile-Time Address Identity

**Decision**: Use `original-id` from the upstream `Published.toml` as the compile-time dependency address for `world`.

**Rationale**: The Sui Move type system uses the original package ID for type identity and linking. When a package is upgraded, its `published-at` changes, but all types and function signatures are still rooted in the `original-id`. The builder's output `dependencies[]` will contain the addresses actually used during compilation.

**Evidence from live Published.toml**:

- Stillness: `original-id` = `published-at` = `0x28b4...` (version 1, never upgraded)
- Utopia: `original-id` = `0xd12a...`, `published-at` = `0x07e6...` (version 2, upgraded)

**Implication**: The `PackageReferenceBundle.worldPackageId` field currently stores the address used in transactions. This may need disambiguation from the original-id used at compile time. For Stillness they happen to be equal; for Utopia they differ.

## R4. Version Tag Mapping

**Decision**: Extend `PackageReferenceBundle` with `sourceVersionTag` field.

**Rationale**: The existing bundle already stores all per-target metadata. Adding the version tag keeps it co-located and trivial to update.

**Current live version mapping** (from GitHub tags and Published.toml):

- `testnet:stillness` → `v0.0.18` (version 1, toolchain 1.67.1)
- `testnet:utopia` → `v0.0.21` (version 2, toolchain 1.68.0, upgraded from v0.0.18→v0.0.20)

**Note**: The vendored copy is `v0.0.14` (commit `78854fe`). This is much older than either target. The vendored copy is used only for the authoring shim and does not affect deploy-grade compilation.

## R5. Toolchain Version Compatibility

**Decision**: Warn at deploy time if the WASM builder's toolchain version differs from the target's `toolchain-version`, but allow the user to proceed.

**Rationale**: The builder exposes `getSuiMoveVersion()` to retrieve its embedded compiler version. The target's toolchain version is available in `Published.toml`. A mismatch is informational, not necessarily fatal — minor version differences often produce compatible bytecode.

**API**: `getSuiMoveVersion(options?)` returns a version string.

## R6. Authorization Transaction Pattern

**Decision**: Follow the borrow → authorize → return three-step pattern from `vendor/world-contracts/ts-scripts/builder_extension/authorize-turret.ts`.

**Rationale**: This is the canonical pattern used by CCP's own scripts. The pattern is:

1. `borrow_owner_cap` from Character (returns `[ownerCap, receipt]`)
2. `authorize_extension<Auth>` on Turret (takes `turretId`, `ownerCap`)
3. `return_owner_cap` to Character (takes `characterId`, `ownerCap`, `receipt`)

**Key details**:

- `authType` format: `{extensionPackageId}::{moduleName}::TurretAuth`
- Character ID is derived from `objectRegistryId` + game character item ID + world package ID
- OwnerCap is looked up dynamically per turret
- Sequential processing required because OwnerCap borrow creates a hot-potato receipt

## R7. Deployment State Persistence

**Decision**: Use localStorage with a versioned JSON schema, keyed by a combination of module name and target.

**Rationale**: The existing codebase already uses localStorage for package reference overrides (`frontier-flow:world-package-overrides`). The deployment state has a similar lifecycle — small, per-browser, session-spanning.

**Invalidation**: State must be invalidated when the generated contract module name changes (checked on app load by comparing stored module name against current artifact).

## R8. Dependency Resolution Caching

**Decision**: Cache `ResolvedDependencies` in memory (session-scoped) keyed by `targetId + sourceVersionTag`.

**Rationale**: `resolveDependencies()` is the expensive operation (network fetch + resolution). The returned `ResolvedDependencies` is an opaque JSON triple that can be reused across multiple `buildMovePackage()` calls. Cache validation compares the key against current target metadata.

**Not persisted to localStorage**: Resolution data includes fetched file content and may be large. Session-scoped caching is sufficient since deploy-grade compilation is an explicit user action, not a background operation.
