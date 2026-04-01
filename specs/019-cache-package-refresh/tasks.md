# 1. Tasks: Cache Package Refresh

**Input**: Design documents from `/specs/019-cache-package-refresh/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## 1.1 Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Every task includes exact file paths

---

## 1.2 Phase 1: Setup (Shared Snapshot Scope)

**Purpose**: Align the maintained target/version inputs before runtime and preload work starts

- [x] T001 Align maintained remote snapshot coverage between `src/data/packageReferences.ts` and `scripts/deploy-cache-packages.json`
- [x] T002 [P] Create task-focused snapshot fixtures for bundled dependency payloads in `src/__tests__/compiler/helpers.ts`

---

## 1.3 Phase 2: Foundational (Blocking Snapshot Validation)

**Purpose**: Add shared validation and parsing primitives that both runtime loading and preload generation depend on

**CRITICAL**: No user story work should begin until this phase is complete

- [x] T003 Extend deploy-grade snapshot types for validation and materialization metadata in `src/compiler/types.ts`
- [x] T004 Add failing unit tests for required package validation, case-insensitive package matching, and empty-file rejection in `src/__tests__/dependencySnapshotValidation.test.ts`
- [x] T005 Create shared bundled snapshot validation and package lookup helpers in `src/deployment/dependencySnapshotValidation.ts`
- [x] T006 Wire `src/deployment/dependencySnapshotLoader.ts` to use the shared snapshot validation helpers and reject invalid bundled snapshots before reuse

**Checkpoint**: Bundled snapshots are typed and validated consistently for both runtime and preload flows

---

## 1.4 Phase 3: User Story 1 - Deploy With Bundled Dependency Snapshots (Priority: P1)

**Goal**: Supported remote targets compile from bundled cache data without live GitHub package fetches during deploy-grade compilation

**Independent Test**: Run deploy-grade compilation for `testnet:stillness` or `testnet:utopia` with a bundled snapshot and confirm that no `raw.githubusercontent.com/MystenLabs/sui` package-source requests occur

### 1.4.1 Tests for User Story 1

- [x] T007 [P] [US1] Add deploy-grade compiler tests for transitive package materialization from bundled snapshots in `src/__tests__/compiler/deployGradeCompiler.test.ts`
- [x] T008 [P] [US1] Add executor tests proving cache-hit deploy-grade compilation reuses bundled snapshots without calling `fetchWorldSource()` in `src/__tests__/deploymentExecutor.test.ts`
- [x] T009 [P] [US1] Add authoring-path isolation regression tests proving non-deployment compilation does not load deploy-grade snapshot logic in `src/__tests__/compiler/moveCompiler.test.ts`

### 1.4.2 Implementation for User Story 1

- [x] T010 [US1] Refactor bundled package extraction to materialize a complete local dependency tree from cached package snapshots in `src/compiler/deployGradeCompiler.ts`
- [x] T011 [US1] Preserve world-specific manifest rewrite and sanitization rules inside the generalized materialization flow in `src/compiler/deployGradeCompiler.ts`
- [x] T012 [US1] Update deploy-grade execution wiring to pass validated bundled snapshots through the cache-hit path in `src/deployment/executor.ts`

**Checkpoint**: Supported remote targets compile from bundled snapshots without network-backed package fetches on cache hits, while authoring compilation remains isolated

---

## 1.5 Phase 4: User Story 2 - Regenerate and Validate Shipped Cache Artifacts (Priority: P1)

**Goal**: Maintainers can regenerate deterministic bundled snapshots and fail fast when required package payloads are missing

**Independent Test**: Run `bun run ./scripts/preload-deploy-cache.ts ./scripts/deploy-cache-packages.json` and confirm that the generated snapshots contain `MoveStdlib`, `Sui`, and `World` payloads for maintained remote targets

### 1.5.1 Tests for User Story 2

- [x] T013 [P] [US2] Add validation tests for preload snapshot completeness and deterministic package ordering in `src/__tests__/dependencySnapshotValidation.test.ts`

### 1.5.2 Implementation for User Story 2

- [x] T014 [US2] Refactor `scripts/preload-deploy-cache.ts` to validate required packages and serialize deterministic bundled snapshot output
- [x] T015 [US2] Update maintained snapshot manifest entries and coverage comments in `scripts/deploy-cache-packages.json`
- [x] T016 [US2] Regenerate and check in maintained bundled snapshots in `public/deploy-grade-resolution-snapshots/v0.0.18.json` and `public/deploy-grade-resolution-snapshots/v0.0.21.json`

**Checkpoint**: Maintained bundled snapshots are reproducible, validated, and aligned with supported remote targets

---

## 1.6 Phase 5: User Story 3 - Fall Back Cleanly When Bundled Cache Cannot Be Used (Priority: P2)

**Goal**: Cache misses and invalid snapshots fall back explicitly to the network-backed path, with clear diagnostics when the bundled cache cannot satisfy deploy-grade compilation

**Independent Test**: Remove or corrupt a matching snapshot, trigger deploy-grade compilation, and verify the runtime either falls back cleanly to the network-backed fetch path or surfaces a cache-validation failure with a targeted message

### 1.6.1 Tests for User Story 3

- [x] T017 [P] [US3] Add cache-miss and invalid-snapshot fallback tests in `src/__tests__/deploymentExecutor.test.ts`
- [x] T018 [P] [US3] Add fallback error classification tests for bundled-cache rejection plus upstream fetch failure in `src/__tests__/compiler/deployGradeCompiler.test.ts`

### 1.6.2 Implementation for User Story 3

- [x] T019 [US3] Implement explicit bundled-cache miss and invalid-snapshot fallback handling in `src/deployment/dependencySnapshotLoader.ts` and `src/deployment/executor.ts`
- [x] T020 [US3] Surface bundled-cache validation and fallback diagnostics in deploy-grade error handling in `src/compiler/deployGradeCompiler.ts`
- [x] T021 [US3] Update world-source fetch error messaging to distinguish bundled-cache fallback failures from direct upstream fetch failures in `src/deployment/worldSourceFetcher.ts`

**Checkpoint**: Unsupported or invalid bundled snapshots fail clearly and fall back only when appropriate

---

## 1.7 Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation sync, and release-safety checks across all stories

- [x] T022 [P] Update deploy-grade dependency cache documentation in `docs/REMOTE-DEPLOYMENT-DEPENDENCY-RESOLUTION.md` and `docs/TESTING-STRATEGY.md`
- [x] T023 [P] Add regression and manual network/performance verification notes in `specs/019-cache-package-refresh/quickstart.md`
- [ ] T024 Validate warm cache-hit deploy-grade compilation against the 30-second target and record the result in `specs/019-cache-package-refresh/quickstart.md`
- [x] T025 Run focused quickstart validation for deploy-grade compiler and executor tests using `src/__tests__/compiler/deployGradeCompiler.test.ts`, `src/__tests__/deploymentExecutor.test.ts`, `src/__tests__/dependencySnapshotValidation.test.ts`, and `src/__tests__/compiler/moveCompiler.test.ts`

---

## 1.8 Dependencies & Execution Order

### 1.8.1 Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion; this is the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can proceed in parallel with User Story 1 once validation primitives exist
- **User Story 3 (Phase 5)**: Depends on User Story 1 runtime wiring so fallback paths can be exercised against the new cache-hit behavior
- **Polish (Phase 6)**: Depends on the desired user stories being complete

### 1.8.2 User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 and delivers the primary fix
- **User Story 2 (P1)**: Can start after Phase 2 because it shares validation helpers but focuses on preload artifacts
- **User Story 3 (P2)**: Should follow User Story 1 runtime work so fallback paths can be exercised against the new cache-hit behavior

### 1.8.3 Within Each User Story

- Tests should be written before implementation and fail before the fix is applied
- Validation helpers before runtime/preload integration
- Runtime materialization before fallback/error handling
- Snapshot regeneration after preload validation logic is complete
- Performance validation only after cache-hit behavior is stable

### 1.8.4 Parallel Opportunities

- **Phase 1**: T002 can run alongside T001 after the target coverage is understood
- **Phase 2**: T004 should land before T005; T003 can proceed before or alongside the test scaffolding if it is required for type-safe test compilation
- **Phase 3**: T007, T008, and T009 can run in parallel; T010 and T011 stay sequential in the same file
- **Phase 4**: T013 can run in parallel with T014 once the validation contract exists
- **Phase 5**: T017 and T018 can run in parallel before T019-T021
- **Phase 6**: T022 and T023 can run in parallel; T024 and T025 come last

---

## 1.9 Parallel Example: User Story 1

```text
# Launch together after Phase 2 completes:
T007: Add deploy-grade compiler tests in src/__tests__/compiler/deployGradeCompiler.test.ts
T008: Add executor cache-hit tests in src/__tests__/deploymentExecutor.test.ts
T009: Add authoring-path isolation tests in src/__tests__/compiler/moveCompiler.test.ts

# Then implement runtime materialization in order:
T010: Refactor bundled package extraction in src/compiler/deployGradeCompiler.ts
T011: Preserve world-specific rewrite/sanitization rules in src/compiler/deployGradeCompiler.ts
T012: Update cache-hit execution wiring in src/deployment/executor.ts
```

---

## 1.10 Implementation Strategy

### 1.10.1 MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational validation
3. Complete Phase 3: User Story 1
4. Validate that supported targets no longer fetch Sui package sources from GitHub on cache hits and that authoring-time compilation remains isolated

### 1.10.2 Incremental Delivery

1. Finish shared validation and runtime cache-hit materialization
2. Add preload validation and regenerate bundled artifacts
3. Add fallback/error behavior for snapshot misses and invalid bundled cache
4. Finish documentation, performance validation, and focused verification

### 1.10.3 Parallel Team Strategy

1. One engineer handles Phase 2 shared validation and test-first setup
2. One engineer takes User Story 1 runtime materialization while another takes User Story 2 preload validation
3. User Story 3 fallback/error work starts after User Story 1 cache-hit behavior stabilizes

---

## 1.11 Notes

- `[P]` tasks touch different files and can run concurrently
- `[US1]`, `[US2]`, and `[US3]` map directly to the feature spec user stories
- Cache-hit behavior is the core acceptance gate for this feature; preload regeneration alone is insufficient without runtime materialization
- The fallback path remains intentionally supported for unsupported or invalid snapshot states
- T009 and T024 explicitly cover the previously unmapped authoring-isolation and warm-path performance requirements