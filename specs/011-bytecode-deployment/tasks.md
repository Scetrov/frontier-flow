# Tasks: Bytecode Deployment Targets

**Input**: Design documents from `/specs/011-bytecode-deployment/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

`__tests__`: Tests are required for this feature. The project constitution and plan call for test-first delivery across UI, hook orchestration, and E2E deployment workflows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3])
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the static deployment target inputs and test scaffolds used by the rest of the feature.

- [x] T001 Create deployment target definitions in `src/data/deploymentTargets.ts`
- [x] T002 [P] Create maintained Stillness and Utopia package reference bundles in `src/data/packageReferences.ts`
- [x] T003 [P] Create deployment fixture builders for tests in `src/__tests__/deployment/testFactories.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the typed deployment model and orchestration primitives that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Extend deployment target, attempt, progress, and status types in `src/compiler/types.ts`
- [x] T005 [P] Update generated artifact helper factories for deployment metadata in `src/__tests__/compiler/helpers.ts`
- [x] T006 [P] Persist selected deployment target in shared UI state storage in `src/utils/uiStateStorage.ts`
- [x] T007 Create deployment orchestration hook with typed state and callbacks in `src/hooks/useDeployment.ts`
- [x] T008 Expose deployment orchestration state from the app shell in `src/App.tsx`

**Checkpoint**: Foundation ready. User stories can now be implemented and tested independently.

---

## Phase 3: User Story 1 - Deploy compiled output to a selected target (Priority: P1) 🎯 MVP

**Goal**: Let users choose `local`, `testnet:stillness`, or `testnet:utopia` next to Build and launch deployment from a fresh compiled artifact.

**Independent Test**: Build a valid graph, select each supported target from the header deploy control, trigger deployment, and verify that the selected target is used and a resulting package identifier is surfaced on success.

### Tests for User Story 1

- [x] T009 [P] [US1] Add deploy control interaction tests in `src/__tests__/DeploymentTargetControl.test.tsx`
- [x] T010 [P] [US1] Add deployment success-path orchestration tests in `src/__tests__/useDeployment.success.test.ts`
- [x] T011 [P] [US1] Add target-selection deployment E2E coverage in `tests/e2e/deployment-target-selection.spec.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement the target-aware deploy control component in src/components/DeploymentTargetControl.tsx
- [x] T013 [US1] Extend header build and deploy actions in src/components/Header.tsx
- [x] T014 [US1] Implement target-aware deployment submission and package result handling in src/hooks/useDeployment.ts
- [x] T015 [US1] Thread selected target and deploy actions through the app shell in src/App.tsx
- [x] T016 [US1] Surface target and package result metadata in the Move source view in src/components/MoveSourcePanel.tsx

**Checkpoint**: User Story 1 is independently functional when a compiled artifact can be deployed from the header control to any supported target and success metadata is visible to the user.

---

## Phase 4: User Story 2 - Stop early on deployment blockers with actionable guidance (Priority: P1)

**Goal**: Block deployment before unsafe or invalid submissions and surface clear remediation for stale artifacts, missing wallet readiness, invalid package references, and rejected approval.

**Independent Test**: Trigger deployment with stale artifacts, no wallet, invalid Stillness/Utopia package references, unavailable local target, and rejected signing, and verify that each attempt is blocked or cancelled with a user-actionable explanation.

### Tests for User Story 2

- [x] T017 [P] [US2] Add deployment blocker classification tests in `src/__tests__/useDeployment.blockers.test.ts`
- [x] T018 [P] [US2] Add blocker summary rendering tests in `src/__tests__/CompilationStatus.deployment-blockers.test.tsx`
- [x] T019 [P] [US2] Add deployment blocker E2E coverage in `tests/e2e/deployment-blockers.spec.ts`

### Implementation for User Story 2

- [x] T020 [P] [US2] Implement package reference validation helpers in src/utils/deploymentValidation.ts
- [x] T021 [US2] Implement stale artifact, wallet readiness, target availability, and approval blocker handling in src/hooks/useDeployment.ts
- [x] T022 [US2] Attach blocker summaries to generated artifacts in src/compiler/generators/shared.ts
- [x] T023 [US2] Render deployment blocker remediation details in the footer popup in src/components/CompilationStatus.tsx
- [x] T024 [US2] Surface blocker-specific follow-up messaging in src/components/MoveSourcePanel.tsx

**Checkpoint**: User Story 2 is independently functional when blocked or cancelled deployments never submit unsafe requests and the user can resolve the issue from the surfaced guidance.

---

## Phase 5: User Story 3 - Track deployment progress in a dedicated modal (Priority: P2)

**Goal**: Show a dedicated progress modal with stage-based updates for validation, preparation, signing, submission, and confirmation.

**Independent Test**: Start deployment from a valid compiled artifact, observe the progress modal open immediately, watch stage transitions update in order, dismiss the modal mid-flight, and confirm the deployment continues to completion or terminal failure.

### Tests for User Story 3

- [x] T025 [P] [US3] Add deployment progress modal component tests in `src/__tests__/DeploymentProgressModal.test.tsx`
- [x] T026 [P] [US3] Add deployment stage progression tests in `src/__tests__/useDeployment.progress.test.ts`
- [x] T027 [P] [US3] Add deployment progress modal E2E coverage in `tests/e2e/deployment-progress.spec.ts`

### Implementation for User Story 3

- [x] T028 [P] [US3] Implement the deployment progress modal in `src/components/DeploymentProgressModal.tsx`
- [x] T029 [US3] Extend deployment orchestration with progress stages and dismissible modal state in `src/hooks/useDeployment.ts`
- [x] T030 [US3] Mount the deployment progress modal from the app shell in `src/App.tsx`

**Checkpoint**: User Story 3 is independently functional when users can track active deployment progress in a modal without relying on the footer alone.

---

## Phase 6: User Story 4 - Review deployment errors from the status bar popup (Priority: P2)

**Goal**: Make the footer/status popup the persistent review surface for the latest deployment errors and results, including target, stage, and remediation context.

**Independent Test**: Trigger representative pre-flight and in-flight failures, then verify that the status popup shows the target, failure stage, remediation text, and latest success state without losing the active-session context.

### Tests for User Story 4

- [x] T031 [P] [US4] Add deployment status popup detail tests in `src/__tests__/CompilationStatus.deployment-popup.test.tsx`
- [x] T032 [P] [US4] Add deployment metadata parity tests for the Move source panel in `src/__tests__/MoveSourcePanel.deployment.test.tsx`
- [x] T033 [P] [US4] Add deployment status popup E2E coverage in `tests/e2e/deployment-status-popup.spec.ts`

### Implementation for User Story 4

- [x] T034 [US4] Extend deployment status payloads with target, stage, severity, and package identifier fields in src/compiler/types.ts
- [x] T035 [US4] Render target-aware success and failure detail panels in src/components/CompilationStatus.tsx
- [x] T036 [US4] Align Move source deployment summaries with footer deployment messaging in src/components/MoveSourcePanel.tsx
- [x] T037 [US4] Preserve latest session deployment attempt context for status review in src/hooks/useDeployment.ts

**Checkpoint**: User Story 4 is independently functional when the footer/status popup serves as the durable source of deployment failure and result review.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and validation across all stories.

- [x] T038 [P] Update deployment workflow architecture notes in docs/SOLUTION-DESIGN.md
- [x] T039 [P] Update deployment and review journeys in docs/USER-FLOWS.md
- [x] T040 [P] Document maintained Stillness/Utopia package reference handling in docs/OUTSTANDING-QUESTIONS.md
- [x] T041 Run quickstart validation scenarios from specs/011-bytecode-deployment/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and can start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: User Story 1** depends on Phase 2.
- **Phase 4: User Story 2** depends on Phase 2 and can proceed independently of User Story 1 once the foundation exists.
- **Phase 5: User Story 3** depends on Phase 2 and can proceed independently of User Story 1, though it benefits from the same deployment hook.
- **Phase 6: User Story 4** depends on Phase 2 and can proceed independently, but it integrates most cleanly after User Stories 1 and 2 establish deployment results and blocker metadata.
- **Phase 7: Polish** depends on the stories the team chooses to ship.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after foundational work.
- **US2 (P1)**: No dependency on other user stories after foundational work.
- **US3 (P2)**: No dependency on other user stories after foundational work.
- **US4 (P2)**: Uses the deployment metadata produced by foundational work and is easiest to finish after US1 and US2, but remains independently testable.

### Within Each User Story

- Tests must be written and fail before implementation.
- Data/model extensions precede UI rendering and orchestration changes.
- Hook orchestration precedes app-shell wiring.
- App-shell wiring precedes final UI/status integration.

## Parallel Opportunities

- `T001` and `T002` can run in parallel once the feature branch is active.
- `T005` and `T006` can run in parallel after `T004` defines the foundational types.
- In **US1**, `T009`, `T010`, and `T011` can run in parallel, followed by `T012` and `T013` in parallel.
- In **US2**, `T017`, `T018`, and `T019` can run in parallel, followed by `T020` and `T022` in parallel.
- In **US3**, `T025`, `T026`, and `T027` can run in parallel, followed by `T028` and `T029` in parallel.
- In **US4**, `T031`, `T032`, and `T033` can run in parallel before the implementation tasks.
- `T038`, `T039`, and `T040` can run in parallel during polish.

## Parallel Example: User Story 1

```bash
# Parallel test work for US1
Task: T009 Add deploy control interaction tests in src/__tests__/DeploymentTargetControl.test.tsx
Task: T010 Add deployment success-path orchestration tests in src/__tests__/useDeployment.success.test.ts
Task: T011 Add target-selection deployment E2E coverage in tests/e2e/deployment-target-selection.spec.ts

# Parallel component work for US1
Task: T012 Implement the target-aware deploy control component in src/components/DeploymentTargetControl.tsx
Task: T013 Extend header build and deploy actions in src/components/Header.tsx
```

## Parallel Example: User Story 2

```bash
# Parallel blocker test work for US2
Task: T017 Add deployment blocker classification tests in src/__tests__/useDeployment.blockers.test.ts
Task: T018 Add blocker summary rendering tests in src/__tests__/CompilationStatus.deployment-blockers.test.tsx
Task: T019 Add deployment blocker E2E coverage in tests/e2e/deployment-blockers.spec.ts

# Parallel validation work for US2
Task: T020 Implement package reference validation helpers in src/utils/deploymentValidation.ts
Task: T022 Attach blocker summaries to generated artifacts in src/compiler/generators/shared.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate target selection and successful deployment independently.

### Incremental Delivery

1. Ship **US1** for basic deploy-to-target behavior.
2. Add **US2** to make the workflow safe and user-actionable.
3. Add **US3** to make in-flight deployment understandable.
4. Add **US4** to make failure and success review durable from the footer/status popup.

### Parallel Team Strategy

1. One developer completes Setup + Foundational.
2. After Phase 2, split work by story:
   - Developer A: US1 target selection and deployment launch
   - Developer B: US2 blocker detection and remediation
   - Developer C: US3 progress modal
   - Developer D: US4 status popup review surfaces

## Notes

- All tasks follow the required checklist format and include exact file paths.
- Story phases are organized so each story remains independently testable.
- Tasks marked `[P]` avoid same-file conflicts within their phase.
- The plan assumes TDD-style delivery because the project constitution requires it for new features.
