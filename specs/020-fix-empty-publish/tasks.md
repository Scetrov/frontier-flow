# 1. Tasks: Prevent Empty Publish Deployment

**Input**: Design documents from `/specs/020-fix-empty-publish/`  
**Prerequisites**: `plan.md` and `spec.md`; optional inputs used: `research.md`, `data-model.md`, `contracts/interfaces.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## 1.1. Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when dependencies are satisfied and files do not overlap
- **[Story]**: Which user story the task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Include exact file paths in every task description

---

## 1.2. Phase 1: Setup

**Purpose**: Prepare focused regression fixtures and shared task inputs for the empty-publish fix.

- [ ] T001 [P] Add empty publish-payload artifact fixtures in `src/__tests__/compiler/helpers.ts`
- [ ] T002 [P] Add blocked-attempt fixture helpers for `publish-payload-empty` scenarios in `src/__tests__/deployment/testFactories.ts`

---

## 1.3. Phase 2: Foundational

**Purpose**: Build the shared validation and publisher safety rails that block all user story work.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [ ] T003 Add failing executor regression coverage for empty publish payloads in `src/__tests__/deploymentExecutor.test.ts`
- [ ] T004 [P] Add failing remote publisher empty-modules coverage in `src/__tests__/publishRemote.test.ts`
- [ ] T005 [P] Add failing local publisher empty-modules coverage in `src/__tests__/publishLocal.test.ts`
- [ ] T006 Add failing blocked-state coverage for empty publish payloads in `src/__tests__/useDeployment.blockers.test.ts` and `src/__tests__/CompilationStatus.deployment-popup.test.tsx`
- [ ] T007 Add the stable `publish-payload-empty` result contract in `src/compiler/types.ts`
- [ ] T008 Implement the executor-level final publish-payload validation and blocked-result mapping in `src/deployment/executor.ts`
- [ ] T009 [P] Implement the remote publisher guard before `Transaction.publish()` in `src/deployment/publishRemote.ts`
- [ ] T010 [P] Implement the local publisher guard before `Transaction.publish()` in `src/deployment/publishLocal.ts`

**Checkpoint**: Shared empty-publish protection is in place and no publisher can construct a Sui Move publish transaction with an empty module list.

---

## 1.4. Phase 3: User Story 1 - Deploy a Prepared Contract Successfully (Priority: P1) 🎯 MVP

**Goal**: Preserve successful Sui Move deployment when the final publish payload is valid.

**Independent Test**: Start a deployment-ready contract on a supported target and confirm the app still reaches the existing signing, submission, and confirmation flow without tripping the new guard.

### 1.4.1. Tests for User Story 1

- [ ] T011 [US1] Add executor success-path regression coverage for valid final publish payloads in `src/__tests__/deploymentExecutor.test.ts`
- [ ] T012 [P] [US1] Add publisher success-path regression coverage for non-empty module lists in `src/__tests__/publishRemote.test.ts` and `src/__tests__/publishLocal.test.ts`

### 1.4.2. Implementation for User Story 1

- [ ] T013 [US1] Preserve successful stage progression and confirmation metadata after payload validation in `src/deployment/executor.ts`
- [ ] T014 [US1] Preserve successful transaction construction for non-empty final module lists in `src/deployment/publishRemote.ts` and `src/deployment/publishLocal.ts`

**Checkpoint**: User Story 1 is complete when valid deployments still proceed normally and no success-path regression appears in the Sui Move publish flow.

---

## 1.5. Phase 4: User Story 2 - Block Invalid Publish Attempts Before Submission (Priority: P1)

**Goal**: Stop empty-publish attempts before wallet approval or network submission and show actionable remediation.

**Independent Test**: Force an empty final module list and verify the deployment is blocked locally, no publisher execution occurs, and the user sees a blocked deployment message instead of the raw chain parser error.

### 1.5.1. Tests for User Story 2

- [ ] T015 [US2] Add blocked-before-wallet coverage for empty deploy-grade and artifact payloads in `src/__tests__/useDeployment.blockers.test.ts`
- [ ] T016 [P] [US2] Add blocked review-surface coverage for `publish-payload-empty` outcomes in `src/__tests__/CompilationStatus.deployment-popup.test.tsx`

### 1.5.2. Implementation for User Story 2

- [ ] T017 [US2] Surface `publish-payload-empty` executor outcomes as blocked deployment messaging in `src/hooks/useDeployment.ts`
- [ ] T018 [US2] Align incomplete deployment-package remediation copy and next-action guidance in `src/utils/deploymentValidation.ts` and `src/hooks/useDeployment.ts`

**Checkpoint**: User Story 2 is complete when malformed publish attempts are blocked before submission and the UI explains how to recover.

---

## 1.6. Phase 5: User Story 3 - Recover and Retry in the Same Session (Priority: P2)

**Goal**: Let users rebuild and retry after a blocked empty-publish attempt while preserving review history.

**Independent Test**: Trigger a blocked empty-publish attempt, rebuild or refresh the package state, retry deployment in the same session, and confirm the later success appears alongside the earlier blocked attempt in review history.

### 1.6.1. Tests for User Story 3

- [ ] T019 [US3] Add blocked-then-success retry regression coverage in `src/__tests__/useDeployment.blockers.test.ts` and `src/__tests__/CompilationStatus.deployment-popup.test.tsx`

### 1.6.2. Implementation for User Story 3

- [ ] T020 [US3] Preserve blocked-attempt review history and later success entries in `src/hooks/useDeployment.ts`
- [ ] T021 [US3] Re-run final publish-payload validation for every fresh deployment attempt in `src/deployment/executor.ts`

**Checkpoint**: User Story 3 is complete when blocked attempts remain visible and a later successful retry is evaluated and recorded independently.

---

## 1.7. Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation and regression verification across all stories.

- [ ] T022 [P] Update manual verification steps for empty-publish blocking and same-session recovery in `specs/020-fix-empty-publish/quickstart.md`
- [ ] T023 Run focused regression verification with `bun run test:run -- src/__tests__/deploymentExecutor.test.ts src/__tests__/publishRemote.test.ts src/__tests__/publishLocal.test.ts src/__tests__/useDeployment.blockers.test.ts src/__tests__/CompilationStatus.deployment-popup.test.tsx`, then run `bun run typecheck`, `bun run lint`, and `bun run test:run`

---

## 1.8. Dependencies & Execution Order

### 1.8.1. Phase Dependencies

- **Phase 1: Setup** has no dependencies and can start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user story work.
- **Phase 3: US1** depends on Phase 2 and delivers the MVP regression-safe success path.
- **Phase 4: US2** depends on Phase 2 and extends the shared blocked-deployment behavior into user-facing surfaces.
- **Phase 5: US3** depends on Phases 2 and 4 because retry continuity builds on blocked-attempt handling.
- **Phase 6: Polish** depends on all desired user stories being complete.

### 1.8.2. User Story Dependencies

- **US1 (P1)** starts after foundational work and proves that valid deployments still work.
- **US2 (P1)** starts after foundational work and proves that invalid empty-publish attempts are blocked locally.
- **US3 (P2)** depends on the blocked-state work from US2 so retry and review-history behavior can be verified end to end.

### 1.8.3. Within Each User Story

- Write the story tests before the implementation tasks in that phase.
- Implement shared executor and publisher guards before refining hook-level messaging.
- Preserve success-path behavior before layering blocked-state UI messaging.
- Complete the story checkpoint before moving to lower-priority polish work.

---

## 1.9. Parallel Opportunities

- `T001` and `T002` can run in parallel during setup.
- `T004` and `T005` can run in parallel once the shared fixture setup is complete.
- `T009` and `T010` can run in parallel after `T008` defines the shared validation contract.
- `T012` can run in parallel with `T011` because publisher and executor success-path tests live in different files.
- `T016` can run in parallel with `T015` because review-surface and hook-blocker tests are isolated.

### 1.9.1. Parallel Example: Foundational Phase

```text
T004 src/__tests__/publishRemote.test.ts
T005 src/__tests__/publishLocal.test.ts

T009 src/deployment/publishRemote.ts
T010 src/deployment/publishLocal.ts
```

### 1.9.2. Parallel Example: User Story 2

```text
T015 src/__tests__/useDeployment.blockers.test.ts
T016 src/__tests__/CompilationStatus.deployment-popup.test.tsx
```

---

## 1.10. Implementation Strategy

### 1.10.1. MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate that successful Sui Move deployment still works before expanding the blocked-state UX.

### 1.10.2. Incremental Delivery

1. Land the shared executor and publisher safety rails.
2. Confirm valid deployments still succeed.
3. Add blocked-state messaging and remediation.
4. Finish with retry continuity and regression verification.

### 1.10.3. Parallel Team Strategy

1. One developer handles test fixture and executor work (`T001`, `T003`, `T007`, `T008`).
2. One developer handles remote and local publisher safeguards (`T004`, `T005`, `T009`, `T010`).
3. One developer handles hook/status surface work (`T015` through `T020`) after foundational tasks land.

---

## 1.11. Notes

- [P] tasks touch separate files and can proceed in parallel after dependencies are met.
- User story labels map each task directly back to `spec.md` for traceability.
- Suggested MVP scope: **User Story 1** after the foundational phase, because it proves the Sui Move publish path still works when payloads are valid.
- Tests are included because the plan and project constitution require regression coverage for bug fixes and deployment-path changes.
