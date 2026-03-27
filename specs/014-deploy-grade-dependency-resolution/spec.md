# Feature Specification: Deploy-Grade Dependency Resolution

**Feature Branch**: `014-deploy-grade-dependency-resolution`  
**Created**: 2026-03-25  
**Status**: Draft  
**Input**: User description: "Implement the decision made in ADR-009 — specifically to ensure we have the ability to compile, deploy and authorize an extension for turrets."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deploy Extension Against Live World Package (Priority: P1)

A user designs a turret extension in the visual graph editor, generates the Move source, and deploys it to a remote testnet target (Stillness or Utopia). The system compiles the extension against the real upstream `world` package dependency graph — not the local shim — so that the resulting bytecode is valid for on-chain publication and verification. After deployment, the user receives a confirmed package ID backed by a successful on-chain transaction.

**Why this priority**: Without deployable bytecode linked against the real `world` package graph, no remote deployment can succeed. This is the foundational capability that every other story depends on.

**Independent Test**: A user can build a turret extension, select a remote target, deploy, and receive a confirmed package ID. The deployed package is verifiable on-chain and its dependency list includes the correct live `world` package.

**Acceptance Scenarios**:

1. **Given** a user has generated a valid turret extension from the graph editor, **When** they deploy to `testnet:stillness`, **Then** the system compiles against the real `world` package for that target, publishes successfully, and returns a confirmed package ID.
2. **Given** the upstream `world` package has transitive dependencies, **When** the system resolves dependencies for deploy-grade compilation, **Then** all transitive dependencies are resolved correctly and included in the published dependency list.
3. **Given** the user has previously compiled the extension using the local shim for authoring preview, **When** they initiate remote deployment, **Then** the system switches to the deploy-grade compilation path and produces correctly linked bytecode.

---

### User Story 2 — Authorize Deployed Extension on Turrets (Priority: P1)

After a successful remote deployment, the user navigates to the Authorize tab, sees their owned turrets, selects one or more, and authorizes the deployed extension on each selected turret. The authorization transaction is constructed using the real deployed package ID and the `TurretAuth` witness type from the compiled extension.

**Why this priority**: Authorization is the end goal of the entire compile-deploy pipeline. A deployment that cannot be authorized on turrets delivers no user value in the EVE Frontier game.

**Independent Test**: Given a successfully deployed extension package, the user can authorize it on at least one owned turret and see confirmation that the turret now runs the extension.

**Acceptance Scenarios**:

1. **Given** a user has a deployed extension with a confirmed package ID and owns at least one turret, **When** they select a turret and authorize, **Then** the system constructs the correct authorization transaction (borrowing OwnerCap, calling `authorize_extension` with the correct `TurretAuth` type), submits it, and confirms the authorization event.
2. **Given** a turret is already authorized with the same extension, **When** the turret list loads, **Then** that turret is shown as already authorized and cannot be re-authorized with the same package.
3. **Given** the user owns multiple turrets, **When** they select several and authorize, **Then** each turret is authorized sequentially and individual failures do not block the rest.

---

### User Story 3 — Authoring Compilation Remains Fast and Unchanged (Priority: P1)

While the user is editing the graph or previewing generated code, the system continues to use the lightweight local `world` shim for rapid in-browser compilation. The authoring experience — including compile speed, error feedback, and code preview — is not degraded by the introduction of the deploy-grade path.

**Why this priority**: The authoring loop (edit → generate → compile → see feedback) is the primary daily interaction. Degrading it to support deployment would harm the core user experience for a capability used occasionally.

**Independent Test**: The user can add/remove nodes, generate code, and see compilation results in the same time frame as before this feature, with no additional network fetches or delays during authoring.

**Acceptance Scenarios**:

1. **Given** a user is editing the graph and has not initiated deployment, **When** the system compiles the generated extension, **Then** it uses the local shim with no network calls and completes within the existing performance envelope.
2. **Given** the deploy-grade resolution data has been fetched for a prior deployment, **When** the user returns to the graph editor and makes changes, **Then** authoring compilation does not use or depend on the deploy-grade resolution data.

---

### User Story 4 — Clear Feedback on Dependency Resolution Failures (Priority: P2)

When deploy-grade dependency resolution fails — due to network issues, stale metadata, or upstream incompatibility — the user sees a specific, actionable error message explaining the dependency resolution failure rather than a generic wallet or RPC error.

**Why this priority**: Dependency resolution is a new failure surface. Without clear error feedback, users cannot distinguish between a wallet problem, a network problem, and a dependency resolution problem, making troubleshooting impossible.

**Independent Test**: Simulate a dependency resolution failure (e.g., unavailable upstream revision) and verify the user sees a message identifying the resolution step as the failure point with a suggested next action.

**Acceptance Scenarios**:

1. **Given** the upstream `world` package source is unreachable, **When** the user attempts remote deployment, **Then** the system shows an error indicating dependency resolution failed with the specific reason (e.g., "Could not fetch world package source for revision X").
2. **Given** the cached resolution data is stale or incompatible, **When** the user attempts deployment, **Then** the system attempts to re-resolve and, if that also fails, shows a clear message distinguishing this from a compilation or wallet error.
3. **Given** deployment fails after compilation but during transaction submission, **When** the error is a verification mismatch due to dependency linking, **Then** the error message identifies it as a dependency linking issue, not a generic transaction failure.

---

### User Story 5 — Deployment State Persists Across Sessions (Priority: P2)

After a successful deployment, the user can close and reopen the application and still see their deployment state — including the package ID, target, and confirmation reference — without needing to redeploy. This persisted state enables the Authorize tab workflow across browser sessions.

**Why this priority**: Users may deploy and authorize across separate sessions. Without persistence, every browser reload requires a full redeploy before authorization can proceed.

**Independent Test**: Deploy an extension, close the browser tab, reopen the application, and verify the deployment state is restored and the Authorize tab is enabled.

**Acceptance Scenarios**:

1. **Given** a user has successfully deployed an extension, **When** they reload the application, **Then** the deployment state is restored including package ID, module name, target ID, and confirmation reference.
2. **Given** a user changes the contract name or graph structure after deployment, **When** the application reloads, **Then** the stale deployment state is discarded and the Authorize tab becomes disabled.

---

### Edge Cases

- **EC-001** (Target switching): When the user switches deployment targets after resolution data was fetched for a different target, the system MUST discard the cached resolution and re-resolve for the new target. Covered by resolution cache keying on `targetId` + `sourceVersionTag` (FR-012). Tested in T007, T019.
- **EC-002** (World package upgraded between authoring and deployment): The system uses the pinned `sourceVersionTag` from the `PackageReferenceBundle`, not the latest upstream version. If CCP upgrades the world package, the `sourceVersionTag` must be updated in `packageReferences.ts` as a code change. Covered by FR-004, FR-006. Tested in T002.
- **EC-003** (Network loss during resolution): The deploy-grade compiler MUST surface a `DependencyResolutionError` with a user-facing message identifying network failure and suggesting retry. Covered by FR-024. Tested in T017, T019.
- **EC-004** (Incompatible WASM builder version): The system compares the builder's toolchain version against the target's `toolchainVersion` and surfaces a `ToolchainMismatchWarning` but does not block deployment. Covered by FR-026. Tested in T024.
- **EC-005** (OwnerCap inaccessible during batch authorization): Per-turret failure isolation ensures one inaccessible OwnerCap does not block remaining turrets. The failed turret shows a specific error. Covered by FR-019. Tested in T013.

## Requirements *(mandatory)*

### Functional Requirements

#### Deploy-Grade Compilation

- **FR-001**: System MUST maintain two distinct compilation modes: an authoring-time mode using the local `world` shim, and a deploy-grade mode using real upstream dependency resolution.
- **FR-002**: Deploy-grade compilation MUST resolve the `world` dependency against the actual upstream package source, including `Move.toml`, `Move.lock`, and package source files for the pinned revision.
- **FR-003**: Deploy-grade compilation MUST pass `Move.lock`, `rootGit` (derived from the pinned repository identity), and where needed `resolvedDependencies` to the WASM builder.
- **FR-004**: Deploy-grade compilation MUST use the `original-id` from the upstream `Published.toml` as the compile-time dependency address for the `world` package, regardless of whether the target world has been upgraded. The `published-at` address is used only for on-chain reference, not for compilation linking.
- **FR-005**: The system MUST NOT use `Published.toml` injection into a local shim as the sole mechanism for resolving live `world` dependencies during remote deployment.

#### World Package Source Identity

- **FR-006**: The system MUST maintain a durable source identity for each deployment target's `world` package by extending the existing `PackageReferenceBundle` with a `sourceVersionTag` field, co-locating all target metadata (package IDs, registry IDs, and source version tag) in one place.
- **FR-007**: Each deployment target MUST map to a specific upstream `world` package version tag (e.g., `testnet:stillness` → `v0.0.18`, `testnet:utopia` → `v0.0.21`) stored in its `PackageReferenceBundle`.
- **FR-008**: The system MUST fetch the upstream `world` package files for the pinned version tag using the WASM builder's built-in `fetchPackageFromGitHub()` function, which returns a file map of the `contracts/world/` subtree (Move.toml, Move.lock, source modules) from the GitHub repository. If `fetchPackageFromGitHub()` fails consistently during integration testing (e.g., repeated CORS or rate-limit failures across 3+ test runs), the team MUST file an ADR to evaluate a tarball archive fallback before the next sprint.

#### Dependency Resolution

- **FR-009**: The system MUST derive `rootGit` metadata from the pinned repository identity rather than expecting it as a checked-in file.
- **FR-010**: The system MUST support the builder's dependency-resolution phase to produce `resolvedDependencies` from the upstream package inputs.
- **FR-011**: Resolved dependency data MUST be cacheable so that repeated deployments to the same target do not require re-resolution on every attempt.
- **FR-012**: When cached resolution data is used, the system MUST validate it against the current target metadata before reuse.

#### Remote Deployment

- **FR-013**: Remote deployment MUST use the deploy-grade compilation output for transaction construction, not the authoring-time compilation output.
- **FR-014**: The publish transaction MUST include the correct dependency IDs from the deploy-grade compilation result.
- **FR-015**: Deployment confirmation MUST verify the published package's `TurretAuth` struct is queryable on-chain before marking deployment as succeeded.

#### Turret Authorization

- **FR-016**: After successful deployment, users MUST be able to fetch their owned turrets from the selected target network.
- **FR-017**: The authorization transaction MUST borrow the OwnerCap from the user's Character, call `authorize_extension` with the correct `TurretAuth` type reference derived from the deployed package, and return the OwnerCap.
- **FR-018**: Turrets already authorized with the same extension package MUST be identified and shown as already authorized.
- **FR-019**: Batch authorization of multiple turrets MUST process sequentially, and failure on one turret MUST NOT prevent authorization of subsequent turrets.
- **FR-020**: Authorization MUST NOT be marked confirmed until the corresponding on-chain authorization event is received.

#### Deployment State Persistence

- **FR-021**: Successful deployment state (package ID, module name, target ID, transaction digest, timestamp) MUST be persisted in local storage.
- **FR-022**: Persisted deployment state MUST be restored on application reload and used to enable the Authorize tab.
- **FR-023**: Persisted deployment state MUST be invalidated when the generated contract name, module structure, or target changes.

#### Error Handling

- **FR-024**: Dependency resolution failures MUST be surfaced with specific error messages identifying the resolution step and cause, distinct from compilation, wallet, or RPC errors.
- **FR-025**: If browser-based deploy-grade compilation fails due to builder limitations with the upstream `world` revision, the system MUST report this clearly and not fall through to a silent or misleading failure.
- **FR-026**: The system MUST compare the WASM builder's compiler version against the `toolchain-version` from the target's upstream `Published.toml` at deploy time. If the versions differ, the system MUST display a warning to the user but MUST NOT block deployment — the user may proceed at their discretion.

### Key Entities

- **PackageReferenceBundle** (extended): The existing per-target metadata bundle, extended with `sourceVersionTag`, `originalWorldPackageId`, and `toolchainVersion` fields to co-locate source identity alongside package IDs and registry IDs.
- **ResolvedWorldSource**: Fetched world package source files for a specific version tag — a file map plus fetch timestamp, cached in-memory within the session.
- **CachedDependencyResolution**: The cached output of the builder's `resolveDependencies()` phase, keyed by `targetId` + `sourceVersionTag` for reuse across compilations within a session.
- **DeployGradeCompileResult**: The output of compiling an extension against the real `world` dependency graph — includes compiled modules, resolved dependency IDs, digest, provenance metadata, and `builderToolchainVersion`.
- **PersistedDeploymentState**: The persisted record of a successful deployment — package ID, module name, target, digest, and timestamp — stored under localStorage key `frontier-flow:deployment` and used to gate the authorization workflow.
- **TurretAuthorizationState**: Per-turret authorization progress during batch processing — transient in-component state tracking status, transaction digest, and error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can compile, deploy, and authorize an extension on a turret in a single end-to-end workflow without manual workarounds or external tooling.
- **SC-002**: 100% of successful remote deployments produce bytecode that passes on-chain verification against the live `world` package — no verification failures caused by dependency mismatch.
- **SC-003**: Authoring-time compilation (edit → generate → compile → feedback) completes within the same performance envelope as before this feature, with no additional network fetches during the authoring loop.
- **SC-004**: Deploy-grade dependency resolution completes within 30 seconds for a warm cache and within 60 seconds for a cold resolution (excluding wallet signing time).
- **SC-005**: 95% of users who have a deployed extension can successfully authorize it on at least one turret on their first attempt. Measured via manual acceptance testing (minimum 5 testers, 2 turrets each) before release sign-off.
- **SC-006**: Dependency resolution error messages correctly identify the failure surface (resolution vs. compilation vs. wallet vs. network) in 100% of failure scenarios.
- **SC-007**: Deployment state survives browser reload with 100% fidelity — package ID, target, and confirmation reference are accurately restored.
- **SC-008**: The end-to-end workflow (compile → deploy → authorize) can be completed in under 5 minutes excluding wallet signing time.

## Clarifications

### Session 2026-03-25

- Q: How should the system obtain world package source files for deploy-grade compilation? → A: Fetch from GitHub at deploy time per the required version tag.
- Q: Which world package ID should be used as the compile-time dependency address when the target world has been upgraded? → A: Use `original-id` from `Published.toml` as the compile-time dependency address for all targets.
- Q: What fetch strategy should the system use to obtain the full world source tree in the browser? → A: Use the builder's `fetchPackageFromGitHub()` function, which handles fetching internally. The deploy-grade path provides `rootGit` metadata so the builder resolves upstream sources automatically.
- Q: Where should the version tag per deployment target be defined and maintained? → A: Extend the existing `PackageReferenceBundle` with a `sourceVersionTag` field in `packageReferences.ts`.
- Q: How should the system handle a potential toolchain version mismatch between the WASM builder and the target world's published toolchain version? → A: Warn at deploy time if versions differ, but allow the user to proceed.

## Assumptions

- The WASM-based Move builder supports source-resolved compilation with `Move.lock`, `rootGit`, and `resolvedDependencies` inputs as described in its architecture. This has been confirmed in the analysis documented in the Remote Deployment Dependency Resolution reference.
- Each testnet deployment target maps to a specific, infrequently-changing `world-contracts` version tag managed by CCP (e.g., `testnet:stillness` → `v0.0.18`, `testnet:utopia` → `v0.0.21`).
- The `world-contracts` repository and its tagged revisions remain publicly accessible for fetching source files and `Move.lock` at deploy time via GitHub's raw content or archive APIs.
- The turret authorization transaction pattern follows the existing `authorize-turret.ts` reference in the vendored `world-contracts`, using OwnerCap borrowing and `authorize_extension`.
- Local deployment targets do not require deploy-grade dependency resolution since they compile and deploy against a locally running validator.
- The browser WASM builder is capable of compiling the pinned `world` revision without requiring server-side compilation. If this assumption proves false, a server-assisted fallback is documented in ADR-009 but is out of scope for the initial implementation.

## Dependencies & Constraints

- **ADR-009**: This feature implements the accepted decision. The architecture must conform to the two-mode compilation model (authoring vs. deploy-grade) described therein.
- **Feature 012 (Real Contract Deployment)**: This feature extends the existing deployment pipeline. The deployment executor, confirmation flow, and stage model from Feature 012 are prerequisites.
- **Feature 013 (Turret Authorization)**: The turret list fetching, authorization transaction construction, and Authorize tab UI from Feature 013 are prerequisites for the authorization portion of this feature.
- **WASM Builder Compatibility**: The Move builder must support the required resolution inputs. If a builder update is needed, it becomes a blocking external dependency.
- **Network Access**: Deploy-grade resolution requires fetching upstream package files, which means the browser must have network access to the `world-contracts` repository (or a cached/vendored copy).
