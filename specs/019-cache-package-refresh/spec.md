# 1. Feature Specification

**Feature Branch**: `019-cache-package-refresh`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "can you make a plan to update the packages in the cache to avoid the 429 errors raised while `raw.githubusercontent.com/MystenLabs/sui/...` is fetched during deploy-grade compilation"

## 1.1 User Scenarios & Testing

### 1.1.1 User Story 1 - Deploy With Bundled Dependency Snapshots (Priority: P1)

A user deploys an extension to a supported remote target such as Stillness or Utopia. When the target's `sourceVersionTag` matches a bundled deploy-grade snapshot, Frontier Flow compiles the extension from the shipped cache instead of re-fetching Sui framework and world package sources from GitHub during the browser session.

**Why this priority**: This is the direct fix for the 429 failure mode. If deploy-grade compilation still reaches `raw.githubusercontent.com` on a cache hit, remote deployment remains fragile and rate-limit dependent.

**Independent Test**: Use a supported target with a bundled snapshot, start deploy-grade compilation, and verify that the deployment path completes without any network requests to `raw.githubusercontent.com/MystenLabs/sui` or the world-contracts tree endpoints.

**Acceptance Scenarios**:

1. **Given** the selected target has a bundled snapshot for its `sourceVersionTag`, **When** deploy-grade compilation starts, **Then** Frontier Flow MUST materialize dependencies from the bundled cache and MUST NOT fetch Sui framework package files from GitHub.
2. **Given** the selected target has a bundled snapshot for its `sourceVersionTag`, **When** deploy-grade compilation builds the local package graph, **Then** it MUST use cached package sources for every required package in the graph, not just the root `world` package.
3. **Given** the bundled snapshot is used, **When** compilation succeeds, **Then** the produced bytecode and dependency list MUST remain valid for the selected live target.

---

### 1.1.2 User Story 2 - Regenerate and Validate Shipped Cache Artifacts (Priority: P1)

A maintainer updates the shipped cache artifacts whenever target package versions change or the snapshot format is improved. The preload script produces deterministic JSON snapshots that contain the packages required for deploy-grade compilation and fails fast if a snapshot is incomplete.

**Why this priority**: The runtime can only avoid GitHub rate limits if the checked-in cache artifacts are complete and aligned with `packageReferences.ts`.

**Independent Test**: Run the preload script against the manifest, inspect the generated snapshots, and verify that each maintained remote target points to a snapshot containing `MoveStdlib`, `Sui`, and `World` package payloads with source files.

**Acceptance Scenarios**:

1. **Given** a maintainer runs the preload script, **When** snapshots are generated, **Then** the output MUST include all dependency packages required for deploy-grade compilation of the configured targets.
2. **Given** a snapshot is missing a required package or required package files, **When** the preload validation runs, **Then** the process MUST fail with a message identifying the missing package or file set.
3. **Given** `packageReferences.ts` points to a supported remote `sourceVersionTag`, **When** a release candidate is prepared, **Then** a matching bundled snapshot MUST exist for that version.

---

### 1.1.3 User Story 3 - Fall Back Cleanly When Bundled Cache Cannot Be Used (Priority: P2)

A user deploys against an unsupported, stale, or mismatched target version. Frontier Flow falls back to the existing network-backed fetch and resolution path only when the bundled cache cannot satisfy the request, and it reports clearly that the request missed the shipped cache.

**Why this priority**: Cache misses will still happen for newly introduced tags, local experiments, or invalid checked-in artifacts. The fallback path must remain explicit instead of silently hiding why network traffic resumes.

**Independent Test**: Force a target/snapshot mismatch or corrupt a snapshot, then verify that Frontier Flow either falls back once to the network-backed path with a cache-miss progress message or fails with a targeted cache-validation error.

**Acceptance Scenarios**:

1. **Given** no bundled snapshot matches the selected `sourceVersionTag`, **When** deploy-grade compilation starts, **Then** Frontier Flow MUST fall back to the existing `fetchWorldSource` and dependency-resolution path.
2. **Given** a bundled snapshot exists but is invalid or incomplete, **When** it is loaded, **Then** Frontier Flow MUST reject the snapshot before build and present a cache-validation error or explicitly fall back.
3. **Given** the runtime falls back to network-backed resolution, **When** that path encounters rate limits or fetch failures, **Then** the user-facing error MUST explain that the bundled cache was unavailable and that upstream fetches failed.

## 1.2 Edge Cases

- **EC-001**: A snapshot contains `World` but is missing `Sui` or `MoveStdlib`; the loader MUST treat this as an invalid bundled cache for deploy-grade compilation.
- **EC-002**: `packageReferences.ts` is updated to a new `sourceVersionTag` without regenerating `public/deploy-grade-resolution-snapshots`; the runtime MUST not pretend the cache is warm.
- **EC-003**: A target-specific snapshot is present but its package names differ only by casing (`World` vs `world`); package extraction MUST remain case-insensitive.
- **EC-004**: The bundled snapshot is valid, but the authoring-time compilation path is used; authoring compilation MUST remain unchanged and MUST NOT load deploy-grade snapshots.
- **EC-005**: Local targets or ad hoc versions without bundled snapshots continue to use the network-backed path and MUST not be blocked by the new cache-first behavior.

## 1.3 Requirements

### 1.3.1 Functional Requirements

- **FR-001**: The deploy-grade runtime MUST prefer bundled dependency snapshots for supported remote targets before calling `fetchWorldSource()` or the builder's network-backed dependency-resolution path.
- **FR-002**: A bundled snapshot used for deploy-grade compilation MUST contain the package payloads required to compile the selected target, including `MoveStdlib`, `Sui`, and `World` sources.
- **FR-003**: The deploy-grade compiler MUST materialize a complete local dependency tree from bundled snapshot data rather than only reconstructing `deps/world`.
- **FR-004**: The local file tree created from bundled snapshots MUST preserve the dependency graph required to compile the extension without live GitHub fetches on a cache hit.
- **FR-005**: The preload script MUST generate deterministic snapshot artifacts for every version listed in `scripts/deploy-cache-packages.json`.
- **FR-006**: The preload script MUST validate that every generated snapshot includes the required package set and non-empty source file payloads before writing the checked-in artifact.
- **FR-007**: The runtime snapshot loader MUST validate that a bundled snapshot matches the selected target and `sourceVersionTag` before it is reused.
- **FR-008**: If a bundled snapshot is missing, invalid, or incompatible, the runtime MUST fall back to the existing network-backed source fetch and dependency-resolution path.
- **FR-009**: Cache-hit deploy-grade compilation MUST NOT issue browser requests to `raw.githubusercontent.com/MystenLabs/sui` for package source files.
- **FR-010**: Cache-hit deploy-grade compilation MUST preserve the current deploy-grade semantics for `originalWorldPackageId`, `published-at`, and dependency sanitization.
- **FR-011**: The implementation MUST keep authoring-time compilation isolated from deploy-grade snapshot logic.
- **FR-012**: Tests MUST cover cache-hit, cache-miss, invalid-snapshot, and transitive-dependency materialization behavior.

### 1.3.2 Key Entities

- **BundledDependencySnapshot**: The checked-in JSON artifact keyed by `sourceVersionTag`, with `resolvedAt` metadata and serialized `resolvedDependencies` payloads.
- **ResolvedDependencyPackageSnapshot**: A package entry inside `resolvedDependencies.dependencies`, including package name and source file map.
- **MaterializedDependencyTree**: The local `files` record assembled from the bundled snapshot and passed to `buildMovePackage()` for deploy-grade compilation.
- **DeployCacheManifestEntry**: The configuration record in `scripts/deploy-cache-packages.json` that maps a world-contract version tag to output snapshot path and supported targets.
- **SnapshotValidationResult**: The validation outcome produced during preload and runtime loading, indicating whether the bundled snapshot is complete enough for cache-first deploy-grade compilation.

## 1.4 Success Criteria

### 1.4.1 Measurable Outcomes

- **SC-001**: Supported remote targets with bundled snapshots complete deploy-grade compilation without any browser requests to `raw.githubusercontent.com/MystenLabs/sui` during the compile path.
- **SC-002**: 100% of maintained remote `sourceVersionTag` values in `packageReferences.ts` have a matching bundled snapshot checked into `public/deploy-grade-resolution-snapshots` before release.
- **SC-003**: Preload validation fails deterministically whenever a required package (`MoveStdlib`, `Sui`, or `World`) is absent or has zero source files.
- **SC-004**: Cache-hit deploy-grade compilation stays within the existing warm-path expectation of 30 seconds or less, excluding wallet interaction.
- **SC-005**: Authoring-time compilation behavior and test coverage remain unchanged for non-deployment workflows.

## 1.5 Assumptions

- The existing snapshot format can continue to store the required dependency payloads; the main gap is how the runtime materializes and validates them.
- Supported remote targets remain the versions already mapped in `packageReferences.ts` unless maintainers deliberately add new bundled snapshots.
- The browser WASM builder can compile entirely from a local file tree when the dependency graph is materialized correctly.

## 1.6 Dependencies & Constraints

- The work builds on the accepted deploy-grade compilation direction from ADR-009 and MUST preserve the separation between authoring-time and deploy-grade compilation.
- Snapshot artifacts are shipped as static assets under `public/`, so bundle size and deterministic generation matter.
- The implementation must stay inside the existing React 19 + TypeScript 5.9 + Bun toolchain and follow strict type-safety rules.
