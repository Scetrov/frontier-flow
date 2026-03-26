# Tasks: Verified Contract Deployment

**Input**: Design documents from `/specs/012-real-contract-deployment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

`__tests__`: Tests are required for this feature because the specification and constitution emphasize correctness, repeatability, and testability.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new Sui deployment execution module structure used across all stories.

- [X] T001 Create the deployment executor entry point in `src/deployment/executor.ts`
- [X] T002 [P] Create the local publish module in `src/deployment/publishLocal.ts`
- [X] T003 [P] Create the remote publish module in `src/deployment/publishRemote.ts`
- [X] T004 [P] Create the confirmation polling module in `src/deployment/confirmation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the typed deployment model, target metadata, validation rules, and shared fixtures that all stories depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T005 Extend deployment outcome, evidence, and confirmation-reference types in `src/compiler/types.ts`
- [X] T006 [P] Expand target capability metadata for local and published targets in `src/data/deploymentTargets.ts`
- [X] T007 [P] Normalize published target reference metadata in `src/data/packageReferences.ts`
- [X] T008 Implement target-aware package manifest preparation in `src/compiler/emitter.ts`
- [X] T009 Implement artifact freshness and target prerequisite checks in `src/utils/deploymentValidation.ts`
- [X] T010 [P] Extend shared deployment fixtures for evidence and unresolved outcomes in `src/__tests__/deployment/testFactories.ts`

**Checkpoint**: The typed deployment foundation, target metadata, and shared fixtures are ready for story work.

---

## Phase 3: User Story 1 - Deploy a compiled contract to a real target (Priority: P1) 🎯 MVP

**Goal**: Let users publish the current compiled contract to a local validator or supported remote Sui target and receive target-confirmed evidence.

**Independent Test**: Build a valid contract, deploy once to `local` and once to a supported remote target, and verify each successful attempt returns a real package ID plus confirmation reference.

### Tests for User Story 1

**NOTE**: Write these tests first and confirm they fail before implementing the story.

- [X] T011 [P] [US1] Extend successful local and remote publish hook coverage in `src/__tests__/useDeployment.success.test.ts`
- [X] T012 [P] [US1] Extend deployment target readiness behavior tests in `src/__tests__/DeploymentTargetControl.test.tsx`
- [X] T013 [P] [US1] Extend successful progress-stage rendering tests in `src/__tests__/DeploymentProgressModal.test.tsx`
- [X] T014 [P] [US1] Add deploy-control keyboard, focus-visible, and accessible-name coverage in `src/__tests__/DeploymentTargetControl.test.tsx`
- [X] T015 [P] [US1] Add successful local and remote deployment journeys in `tests/e2e/deployment-progress.spec.ts`

### Implementation for User Story 1

- [X] T016 [US1] Implement local validator publish execution in `src/deployment/publishLocal.ts`
- [X] T017 [US1] Implement wallet-backed remote publish execution in `src/deployment/publishRemote.ts`
- [X] T018 [US1] Implement publish confirmation polling and digest extraction in `src/deployment/confirmation.ts`
- [X] T019 [US1] Compose target-specific Sui execution in `src/deployment/executor.ts`
- [X] T020 [US1] Integrate the real executor, artifact binding, and success evidence flow in `src/hooks/useDeployment.ts`
- [X] T021 [US1] Implement keyboard, labeling, and focus-visible behavior in `src/components/DeploymentTargetControl.tsx`
- [X] T022 [US1] Wire deployment launch and target-confirmed success state updates in `src/App.tsx`
- [X] T023 [US1] Render confirmed package IDs and transaction digests in `src/components/CompilationStatus.tsx`

**Checkpoint**: User Story 1 should support successful local and remote deployment with real confirmation evidence.

---

## Phase 4: User Story 2 - Be protected from incorrect or ambiguous deployments (Priority: P1)

**Goal**: Prevent stale, misconfigured, rejected, failed, or unconfirmed attempts from ever appearing as successful deployments.

**Independent Test**: Exercise blocked, cancelled, failed, and unresolved confirmation paths and verify none of them are surfaced as success.

### Tests for User Story 2

**NOTE**: Write these tests first and confirm they fail before implementing the story.

- [X] T024 [P] [US2] Extend blocker and non-success classification tests in `src/__tests__/useDeployment.blockers.test.ts`
- [X] T025 [P] [US2] Extend deployment blocker popup coverage for failed and unresolved attempts in `src/__tests__/CompilationStatus.deployment-blockers.test.tsx`
- [X] T026 [P] [US2] Add progress-modal focus-management, dismissal, and live-region coverage in `src/__tests__/DeploymentProgressModal.test.tsx`
- [X] T027 [P] [US2] Add blocked, cancelled, failed, and unresolved deployment journeys in `tests/e2e/deployment-blockers.spec.ts`

### Implementation for User Story 2

- [X] T028 [US2] Implement failure, cancellation, and verification-timeout outcome mapping in `src/deployment/executor.ts`
- [X] T029 [US2] Enforce cancelled, failed, and unresolved state transitions in `src/hooks/useDeployment.ts`
- [X] T030 [US2] Implement modal focus management, keyboard dismissal, and live announcements in `src/components/DeploymentProgressModal.tsx`
- [X] T031 [US2] Render terminal-stage remediation and non-success summaries in `src/components/DeploymentProgressModal.tsx`
- [X] T032 [US2] Surface blocker, failure, and unresolved guidance in `src/components/CompilationStatus.tsx`
- [X] T033 [US2] Refine target-specific blocker messaging and retry gating in `src/utils/deploymentValidation.ts`

**Checkpoint**: User Story 2 should block incorrect deployments early and preserve accurate non-success classifications after execution begins.

---

## Phase 5: User Story 3 - Review deployment evidence and retry confidently (Priority: P2)

**Goal**: Preserve enough deployment evidence and recent history for users to review outcomes, compare retries, and continue after dismissing progress UI.

**Independent Test**: Perform multiple attempts with different outcomes, dismiss the modal mid-flight, and verify that the latest result and recent history remain understandable across review surfaces.

### Tests for User Story 3

**NOTE**: Write these tests first and confirm they fail before implementing the story.

- [X] T034 [P] [US3] Extend retry-sequence and history-preservation hook tests in `src/__tests__/useDeployment.progress.test.ts`
- [X] T035 [P] [US3] Extend deployment evidence and history rendering tests in `src/__tests__/MoveSourcePanel.deployment.test.tsx`
- [X] T036 [P] [US3] Add accessible status-popup and review-surface coverage in `src/__tests__/CompilationStatus.deployment-popup.test.tsx` and `src/__tests__/MoveSourcePanel.deployment.test.tsx`
- [X] T037 [P] [US3] Add retry-and-review deployment journeys in `tests/e2e/deployment-status-popup.spec.ts`
- [X] T038 [P] [US3] Add local-validator reset and historical-evidence coverage in `src/__tests__/useDeployment.progress.test.ts`

### Implementation for User Story 3

- [X] T039 [US3] Persist recent deployment evidence and review entries in `src/hooks/useDeployment.ts`
- [X] T040 [US3] Detect local-validator resets and preserve prior local evidence as historical-only in `src/hooks/useDeployment.ts`
- [X] T041 [US3] Implement accessible status-popup semantics, summaries, and history rendering in `src/components/CompilationStatus.tsx`
- [X] T042 [US3] Mirror deployment evidence and accessible review context in `src/components/MoveSourcePanel.tsx`
- [X] T043 [US3] Keep modal dismissal and reopening review-safe in `src/components/DeploymentProgressModal.tsx`
- [X] T044 [US3] Coordinate retry and review state across deployment surfaces in `src/App.tsx`

**Checkpoint**: User Story 3 should let users review deployment evidence and compare retries without losing outcome context.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize verification guidance and stabilize shared fixtures across stories.

- [X] T045 [P] Update local-validator and remote-target verification instructions in `specs/012-real-contract-deployment/quickstart.md`
- [X] T046 [P] Sync post-implementation Sui execution and confirmation findings in `specs/012-real-contract-deployment/research.md`
- [X] T047 Validate and stabilize shared deployment fixtures in `src/__tests__/deployment/testFactories.ts`
- [X] T048 Review deployment logging and sanitize surfaced error details against the no-secrets constraint in `src/deployment/executor.ts`
- [X] T049 Verify deployment-path coverage against constitution thresholds and record the result in `specs/012-real-contract-deployment/quickstart.md`
- [X] T050 Run the explicit project-controlled local-validator verification flow from `specs/012-real-contract-deployment/quickstart.md`
- [X] T051 Run the explicit real remote deployment verification flow from `specs/012-real-contract-deployment/quickstart.md`
- [X] T052 Run the predefined deployment verification scenario five consecutive times and record repeatability results in `specs/012-real-contract-deployment/quickstart.md`
- [X] T053 Verify and record successful local deployment completion time against SC-003 in `specs/012-real-contract-deployment/quickstart.md`
- [X] T054 Verify and record successful remote deployment completion time against SC-004 in `specs/012-real-contract-deployment/quickstart.md`
- [X] T055 Verify and record confirmation-to-evidence latency against SC-005 in `specs/012-real-contract-deployment/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies and can start immediately.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks all story work.
- **Phase 3: User Story 1**: Depends on Phase 2.
- **Phase 4: User Story 2**: Depends on Phase 2 and can be validated independently, but will be easier to implement after the US1 executor path exists.
- **Phase 5: User Story 3**: Depends on Phase 2 and on the core deployment state machinery from earlier stories.
- **Phase 6: Polish**: Depends on the stories the team chooses to ship.

### User Story Dependencies

- **US1**: MVP and first delivery slice.
- **US2**: Independent correctness slice built on the same deployment foundation; practical sequencing is after US1 because both touch the executor and hook.
- **US3**: Depends on the attempt and evidence structures from US1 and the non-success classifications from US2.

### Within Each User Story

- Tests must be written before implementation and observed failing first.
- Executor and data-model work should land before UI wiring that depends on it.
- Hook orchestration should land before final surface rendering.
- Complete the story checkpoint before moving to the next story when working sequentially.

## Parallel Opportunities

- **Setup**: T002, T003, and T004 can run in parallel after T001 defines the execution entry point.
- **Foundational**: T006, T007, and T010 can run in parallel.
- **US1 tests**: T011, T012, T013, T014, and T015 can run in parallel.
- **US2 tests**: T024, T025, T026, and T027 can run in parallel.
- **US3 tests**: T034, T035, T036, T037, and T038 can run in parallel.
- **Polish**: T045 and T046 can run in parallel, T050 and T051 can run in parallel after implementation is complete, and T053 and T054 can run in parallel once the successful verification flows are stable.

## Parallel Example: User Story 1

```bash
# Launch US1 tests together
T011 src/__tests__/useDeployment.success.test.ts
T012 src/__tests__/DeploymentTargetControl.test.tsx
T013 src/__tests__/DeploymentProgressModal.test.tsx
T014 src/__tests__/DeploymentTargetControl.test.tsx
T015 tests/e2e/deployment-progress.spec.ts
```

## Parallel Example: User Story 2

```bash
# Launch US2 correctness tests together
T024 src/__tests__/useDeployment.blockers.test.ts
T025 src/__tests__/CompilationStatus.deployment-blockers.test.tsx
T026 src/__tests__/DeploymentProgressModal.test.tsx
T027 tests/e2e/deployment-blockers.spec.ts
```

## Parallel Example: User Story 3

```bash
# Launch US3 review-surface tests together
T034 src/__tests__/useDeployment.progress.test.ts
T035 src/__tests__/MoveSourcePanel.deployment.test.tsx
T036 src/__tests__/CompilationStatus.deployment-popup.test.tsx
T037 tests/e2e/deployment-status-popup.spec.ts
T038 src/__tests__/useDeployment.progress.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 for real local and remote Sui deployment.
3. Validate the US1 checkpoint before expanding correctness and review features.

### Incremental Delivery

1. Foundation first: typed execution boundary, target metadata, validation, and fixtures.
2. Add US1: real publish and confirmation evidence.
3. Add US2: correctness protections and non-success classification.
4. Add US3: review history, local-reset handling, retry confidence, and cross-surface evidence.
5. Finish with documentation and fixture stabilization.

### Parallel Team Strategy

1. One developer can complete Phase 1 and Phase 2.
2. After the foundation is ready:
   - Developer A can drive US1 executor and hook work.
   - Developer B can prepare US2 tests and blocker-surface coverage.
   - Developer C can prepare US3 review-surface tests and UI updates.
3. Merge shared-file work in the order US1 → US2 → US3 to minimize conflicts in `useDeployment.ts` and `CompilationStatus.tsx`.

## Notes

- `[P]` means the task touches a separate file and can run independently once its prerequisites are met.
- Each task includes an exact file path so implementation can proceed without extra discovery.
- The new `src/deployment/` module is intentional and comes directly from the approved plan.
- The story order keeps the feature shippable after the MVP while preserving strict correctness requirements.
