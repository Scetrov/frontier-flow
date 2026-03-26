# Tasks: Deploy-Grade Dependency Resolution

**Input**: Design documents from `/specs/014-deploy-grade-dependency-resolution/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/interfaces.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Type System & Data Layer)

**Purpose**: Extend the shared type system and data layer that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Extend PackageReferenceBundle and define deploy-grade types (ResolvedWorldSource, CachedDependencyResolution, DeployGradeCompileResult, DeployGradeCompileRequest, DeployCompileProgressEvent, FetchWorldSourceRequest, FetchWorldSourceResult, PersistedDeploymentState, TurretAuthorizationState, DependencyResolutionError, DeployCompilationError, ToolchainMismatchWarning) in src/compiler/types.ts
- [X] T002 [P] Add sourceVersionTag, originalWorldPackageId, and toolchainVersion to testnet target entries (stillness: v0.0.18 / 0x28b4... / 1.67.1, utopia: v0.0.21 / 0xd12a... / 1.68.0) in src/data/packageReferences.ts
- [X] T003 [P] Widen MoveCompilerModule interface to accept optional rootGit, resolvedDependencies, and onProgress fields from BuildInput in src/compiler/moveCompiler.ts

**Checkpoint**: Type system and data layer ready — user story implementation can begin

---

## Phase 2: User Story 1 — Deploy Extension Against Live World Package (Priority: P1) 🎯 MVP

**Goal**: Users can compile an extension against the real upstream `world` package dependency graph, publish it on-chain, and receive a confirmed package ID

**Independent Test**: Build a turret extension, select a remote target (testnet:stillness), deploy, and receive a confirmed package ID verifiable on-chain with correct `world` dependency linkage

### Implementation for User Story 1

- [X] T004 [P] [US1] Create world source fetcher module: wrap builder's fetchPackageFromGitHub() with in-memory session-scoped cache keyed by versionTag, support AbortSignal in `src/deployment/worldSourceFetcher.ts`
- [X] T005 [P] [US1] Write unit tests for world source fetcher (mock fetchPackageFromGitHub, verify cache hit/miss, abort signal cancellation, error wrapping) in `src/__tests__/worldSourceFetcher.test.ts`
- [X] T006 [US1] Create deploy-grade compiler orchestration: derive rootGit from target metadata, call resolveDependencies() with extension files + rootGit, cache ResolvedDependencies keyed by targetId+sourceVersionTag, call buildMovePackage() with resolvedDependencies, return DeployGradeCompileResult with modules/dependencies/digest/provenance in `src/compiler/deployGradeCompiler.ts`
- [X] T007 [P] [US1] Write unit tests for deploy-grade compiler (mock builder resolveDependencies and buildMovePackage, verify rootGit derivation from PackageReferenceBundle, verify resolution cache reuse, verify Move.toml rewrite for git dependency) in `src/__tests__/compiler/deployGradeCompiler.test.ts`
- [X] T008 [US1] Update publishRemote to accept DeployGradeCompileResult (modules, dependencies, digest) directly for transaction construction instead of re-compiling from artifact in `src/deployment/publishRemote.ts`
- [X] T009 [US1] Update publishRemote tests to cover deploy-grade compilation input path (pass DeployGradeCompileResult, verify transaction uses correct dependency IDs) in `src/__tests__/publishRemote.test.ts`
- [X] T010 [US1] Integrate deploy-grade compilation into deployment executor: add fetch-world-source, resolve-dependencies, and deploy-grade-compile stages for remote targets; keep existing shim path for local targets in `src/deployment/executor.ts`
- [X] T010a [US1] Add post-deployment TurretAuth verification to confirmation flow: after publish confirmation, poll RPC to verify the published package's `TurretAuth` struct is queryable on-chain (poll every 2s, max 30s timeout, 3 retries with exponential backoff) before marking deployment as succeeded (FR-015) in src/deployment/confirmation.ts
- [X] T011 [US1] Update useDeployment hook to invoke deploy-grade path when deployment target is remote (testnet:stillness or testnet:utopia), pass progress events from DeployCompileProgressEvent to stage model in src/hooks/useDeployment.ts

**Checkpoint**: User Story 1 complete — extension can be compiled against real world package, published on-chain, and confirmed. The authorisation tab is not yet functional.

---

## Phase 3: User Story 2 — Authorize Deployed Extension on Turrets (Priority: P1)

**Goal**: After deployment, the user can select owned turrets and authorize the deployed extension on each, completing the compile → deploy → authorize workflow

**Independent Test**: Given a deployed extension package ID, authorize it on at least one owned turret and verify the on-chain authorization event

### Implementation for User Story 2

- [X] T012 [P] [US2] Extend existing authorizationTransaction module to support deploy-grade package references: update `buildAuthorizeTurretTransaction()` to accept the deployed extension package ID from `DeployGradeCompileResult`, add already-authorized detection by checking turret extension type against deployed `TurretAuth` witness (FR-018), ensure per-turret failure isolation (FR-019) in `src/utils/authorizationTransaction.ts`
- [X] T013 [P] [US2] Extend existing authorization transaction tests to cover deploy-grade input path (verify transaction uses deploy-grade package ID, already-authorized detection for same extension, per-turret failure isolation, sequential batch processing, target-switch cache invalidation) in `src/__tests__/authorizationTransaction.test.ts`
- [X] T014 [US2] Extend existing useAuthorization hook to integrate deploy-grade deployment state: accept `DeployGradeCompileResult` or `PersistedDeploymentState` as the extension source, expose batch progress/results/summary, support abort in `src/hooks/useAuthorization.ts`
- [X] T015 [US2] Extend existing useAuthorization hook tests for deploy-grade integration (state transitions with deploy-grade package ID, batch progress aggregation, abort handling, error state per turret) in `src/__tests__/useAuthorization.test.ts`

**Checkpoint**: User Stories 1 AND 2 complete — full compile → deploy → authorize turret flow works within a single session

---

## Phase 4: User Story 3 — Authoring Compilation Remains Fast and Unchanged (Priority: P1)

**Goal**: The authoring-time compilation loop (edit → generate → compile → feedback) uses the local world shim, makes no network calls, and remains within the existing performance envelope

**Independent Test**: Add/remove nodes, generate code, compile — verify no network fetches occur and compilation speed matches pre-feature baseline

### Implementation for User Story 3

- [ ] T016 [US3] Add regression tests verifying authoring compilation uses local world shim with zero network calls, does not import or invoke deploy-grade compiler or worldSourceFetcher, and completes within existing performance envelope in `src/__tests__/compiler/moveCompiler.test.ts`

**Checkpoint**: Authoring path confirmed isolated from deploy-grade path — no regression risk

---

## Phase 5: User Story 4 — Clear Feedback on Dependency Resolution Failures (Priority: P2)

**Goal**: When deploy-grade resolution fails, users see specific error messages identifying the resolution step and cause, distinct from compilation/wallet/RPC errors

**Independent Test**: Simulate a resolution failure (e.g., unavailable upstream revision) and verify the user sees a message identifying resolution as the failure point with a suggested action

### Implementation for User Story 4

- [ ] T017 [US4] Implement error classification in deploy-grade compiler: catch and wrap builder errors into DependencyResolutionError (network/CORS/rate-limit/stale cache), DeployCompilationError (linking mismatch), and ToolchainMismatchWarning (informational); attach user-facing messages with suggested actions in `src/compiler/deployGradeCompiler.ts`
- [ ] T018 [US4] Surface classified deploy-grade errors in deployment executor as distinct stage failures (resolution-failed vs compile-failed vs wallet-failed vs network-failed) with user-readable descriptions in `src/deployment/executor.ts`
- [ ] T019 [P] [US4] Write tests for error classification paths (network unreachable wraps to DependencyResolutionError, stale cache triggers re-resolve, CORS rejection classified correctly, verification mismatch classified as linking error) in `src/__tests__/compiler/deployGradeCompiler.test.ts`

**Checkpoint**: Error feedback implemented — users can distinguish resolution failures from other deployment errors

---

## Phase 6: User Story 5 — Deployment State Persists Across Sessions (Priority: P2)

**Goal**: Successful deployment state (package ID, module name, target, digest) persists in localStorage and enables the Authorize tab after browser reload

**Independent Test**: Deploy an extension, close the tab, reopen the app, and verify deployment state is restored and the Authorize tab is enabled

### Implementation for User Story 5

- [X] T020 [P] [US5] Extend existing deployment state persistence module: add deploy-grade fields to `StoredDeploymentState` (sourceVersionTag, builderToolchainVersion), update `parseStoredDeploymentState` to handle new fields, ensure backward compatibility with existing schema version 1 data under localStorage key `frontier-flow:deployment` in `src/utils/deploymentStateStorage.ts`
- [X] T021 [P] [US5] Extend existing deployment state persistence tests to cover deploy-grade fields (save/load roundtrip with new fields, backward compatibility with pre-deploy-grade data, staleness invalidation when moduleName or targetId changes, graceful handling of corrupt localStorage data) in `src/__tests__/deploymentStateStorage.test.ts`
- [X] T022 [US5] Integrate state persistence into useDeployment hook: save PersistedDeploymentState on successful deploy, load and validate on mount, invalidate when generated contract name or target changes in `src/hooks/useDeployment.ts`
- [X] T023 [US5] Update useDeployment hook tests for state persistence lifecycle (restore on mount, invalidate on contract change, clear on target switch) in `src/__tests__/useDeployment.success.test.ts`

**Checkpoint**: Deployment state survives browser reload — authorize tab works across sessions

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Refinements that span multiple user stories

- [ ] T024 [P] Add toolchain version comparison warning: call getSuiMoveVersion() and compare against target's toolchainVersion from PackageReferenceBundle; surface ToolchainMismatchWarning to UI without blocking deployment (FR-026) in src/compiler/deployGradeCompiler.ts
- [ ] T025 Create E2E test for full deploy-grade compile → publish → authorize turret flow with mocked builder and wallet responses; include axe-core accessibility audit for the deploy and authorize tab UI (Constitution VII) in tests/e2e/deploy-authorize.spec.ts
- [ ] T026 Run quickstart.md validation scenarios to verify end-to-end architecture data flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories.
- **US1 (Phase 2)**: Depends on Phase 1 completion. This is the MVP.
- **US2 (Phase 3)**: Depends on Phase 1 completion. Uses types from US1 (DeployGradeCompileResult) but the authorization module extensions can be built independently.
- **US3 (Phase 4)**: Depends on Phase 1 completion. Can run in parallel with US1/US2 — it verifies existing behavior is preserved.
- **US4 (Phase 5)**: Depends on US1 (Phase 2) — extends the error handling in deploy-grade compiler and executor.
- **US5 (Phase 6)**: Depends on Phase 1 completion. The persistence module (T020–T021) can be built in parallel with US1. Integration (T022–T023) depends on US1 (T011).
- **Polish (Phase 7)**: Depends on US1, US2, US4, US5 being complete.

### User Story Dependencies

- **US1 (P1)**: Core pathway — no dependency on other stories. **Start here.**
- **US2 (P1)**: Independently buildable (T012–T013 extend existing `authorizationTransaction.ts`). Hook integration (T014–T015) extends existing `useAuthorization.ts` and benefits from US1 completion for realistic testing.
- **US3 (P1)**: Fully independent — regression tests on existing authoring path.
- **US4 (P2)**: Extends US1's deploy-grade compiler and executor. Must follow US1.
- **US5 (P2)**: Persistence module (T020–T021) extends existing `deploymentStateStorage.ts`. Hook integration (T022–T023) extends US1's useDeployment changes.

### Within Each User Story

- Types/models before services
- Services before integration (executor, hooks)
- Core implementation before tests (tests in parallel where marked [P])
- Story complete before moving to dependent stories

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel (after T001)
- **Phase 2**: T004 + T005 in parallel; T007 in parallel with other story tasks
- **Phase 3**: T012 + T013 in parallel (extend existing modules independently)
- **Phase 4**: T016 can run as soon as Phase 1 completes (parallel with all other stories)
- **Phase 5**: T019 in parallel with T017/T018
- **Phase 6**: T020 + T021 in parallel (extend existing deploymentStateStorage, can also parallel with US1 core)
- **Cross-story**: US3 (Phase 4) can run in parallel with US1, US2, US5

---

## Parallel Example: User Story 1

```text
# After Phase 1 completes, launch in parallel:
T004: "Create world source fetcher in src/deployment/worldSourceFetcher.ts"
T005: "Write tests for world source fetcher in src/__tests__/worldSourceFetcher.test.ts"

# Then sequentially:
T006: "Create deploy-grade compiler in src/compiler/deployGradeCompiler.ts"

# Then in parallel:
T007: "Write tests for deploy-grade compiler in src/__tests__/compiler/deployGradeCompiler.test.ts"
T008: "Update publishRemote in src/deployment/publishRemote.ts"

# Then sequentially:
T009: "Update publishRemote tests in src/__tests__/publishRemote.test.ts"
T010: "Integrate into executor in src/deployment/executor.ts"
T011: "Update useDeployment hook in src/hooks/useDeployment.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (types, data, interface)
2. Complete Phase 2: User Story 1 (deploy-grade compile → publish)
3. **STOP and VALIDATE**: Deploy an extension to testnet:stillness and verify on-chain
4. The application can deploy real extensions — authorize workflow deferred

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 (US1) → Deploy-grade compilation works → **MVP deployed**
3. Phase 3 (US2) → Turret authorization works → Full end-to-end flow
4. Phase 4 (US3) → Authoring regression verified → Confidence in no-regression
5. Phase 5 (US4) → Error feedback polished → Better failure UX
6. Phase 6 (US5) → State persists → Cross-session authorize flow
7. Phase 7 → E2E coverage, toolchain warnings, final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 together
2. Once Foundational is done:
   - Developer A: US1 (deploy-grade core)
   - Developer B: US2 (T012–T013 extend existing authorizer) + US3 (T016 regression tests)
   - Developer C: US5 (T020–T021 extend existing persistence module)
3. After US1 completes: US4 (error feedback), remaining US2/US5 integration tasks
4. Final: Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Test convention: unit tests in `src/__tests__/` (flat, mirrors src structure), E2E in `tests/e2e/`
- TDD approach: write tests before or alongside implementation for each task; test files marked [P] may be written in parallel with their implementation task
- Builder API: `@zktx.io/sui-move-builder` v0.2.8 — `resolveDependencies()`, `buildMovePackage()`, `fetchPackageFromGitHub()`, `getSuiMoveVersion()`
- Compile-time address: use `original-id` from Published.toml, NOT `published-at`
- Authorization pattern: borrow_owner_cap → authorize_extension\<TurretAuth\> → return_owner_cap
- Commit after each task or logical group
- Existing Feature 012 (deployment) and Feature 013 (authorization UI) are prerequisites — US2 and US5 extend existing modules from those features, not create new ones
