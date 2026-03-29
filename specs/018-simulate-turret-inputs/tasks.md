# 1. Tasks: Turret Input Simulation

**Input**: Design documents from `/specs/018-simulate-turret-inputs/`
**Prerequisites**: `plan.md` and `spec.md`; supporting inputs from `research.md`, `data-model.md`, `contracts/interfaces.md`, and `quickstart.md`

**Tests**: Test-first work is required for this feature by project constitution and the feature plan.
**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## 1.1. Phase 1: Setup

**Purpose**: Establish shared simulation scaffolding and reusable test support.

- [X] T001 Create shared simulation domain types in src/types/turretSimulation.ts
- [X] T002 [P] Create reusable simulation fixture builders in src/test/turretSimulationFixtures.ts
- [X] T003 [P] Create GraphQL and dev-inspect mock helpers in src/test/turretSimulationMocks.ts

---

## 1.2. Phase 2: Foundational

**Purpose**: Build blocking primitives that all user stories rely on.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [X] T004 [P] Implement shared draft and numeric validation helpers in src/utils/turretSimulationValidation.ts
- [X] T005 [P] Expose live deployment-key and turret-refresh context helpers in src/components/AuthorizeView.tsx and src/hooks/useTurretList.ts
- [X] T006 Create session-state scaffolding and exported hook API in src/hooks/useTurretSimulation.ts

**Checkpoint**: Shared simulation scaffolding, validation, and live context plumbing are ready.

---

## 1.3. Phase 3: User Story 1 - Open A Turret Simulation (Priority: P1) 🎯 MVP

**Goal**: Let operators launch a turret-specific simulation modal directly from the Authorize roster and keep that modal bound to the current deployment and turret context.

**Independent Test**: Open the Authorize tab with at least one turret, activate the row-level simulation control, and confirm the modal opens with the selected turret and deployment context while blocking stale runs after context changes.

### 1.3.1. Tests For User Story 1

**NOTE**: Write these tests first and confirm they fail before implementation.

- [X] T007 [P] [US1] Add row-level simulate action coverage in `src/__tests__/AuthorizeTurretItem.test.tsx`
- [X] T008 [P] [US1] Add modal-open and stale-context coverage in `src/__tests__/AuthorizeView.test.tsx`
- [X] T009 [P] [US1] Add modal shell and accessibility coverage in `src/__tests__/TurretSimulationModal.test.tsx`

### 1.3.2. Implementation For User Story 1

- [X] T010 [US1] Add an accessible row-level simulate control in `src/components/AuthorizeTurretItem.tsx`
- [X] T011 [US1] Propagate per-turret simulate callbacks through `src/components/AuthorizeTurretList.tsx` and `src/components/AuthorizeView.tsx`
- [X] T012 [US1] Build the simulation modal shell with turret and deployment header state in `src/components/TurretSimulationModal.tsx`
- [X] T013 [US1] Wire modal open/close, deployment snapshots, and stale-context handling in `src/hooks/useTurretSimulation.ts` and `src/components/AuthorizeView.tsx`

**Checkpoint**: User Story 1 is independently functional and testable from the Authorize tab.

---

## 1.4. Phase 4: User Story 2 - Review And Complete Inputs Quickly (Priority: P2)

**Goal**: Pre-fill the candidate draft from local authorization context, offer remote suggestions for unresolved identity fields, and allow clear operator overrides before simulation.

**Independent Test**: Open the modal for a turret, verify known fields are pre-filled, unresolved identity fields offer remote suggestions, and manually edited values override automatic values without breaking validation.

### 1.4.1. Tests For User Story 2

**NOTE**: Write these tests first and confirm they fail before implementation.

- [X] T014 [P] [US2] Add draft hydration and source-provenance coverage in `src/__tests__/TurretSimulationModal.test.tsx`
- [X] T015 [P] [US2] Add remote suggestion parsing coverage in `src/__tests__/turretSimulationQueries.test.ts`
- [X] T016 [P] [US2] Add Authorize-view prefill integration coverage in `src/__tests__/AuthorizeView.test.tsx`

### 1.4.2. Implementation For User Story 2

- [X] T017 [US2] Implement local draft hydration and field-source tracking in src/hooks/useTurretSimulation.ts and src/types/turretSimulation.ts
- [X] T018 [P] [US2] Implement remote suggestion lookups and tolerant GraphQL parsers in src/utils/turretSimulationQueries.ts
- [X] T019 [P] [US2] Reuse owner-character and turret refresh lookups for simulation prefill in src/utils/authorizationTransaction.ts and src/utils/turretQueries.ts
- [X] T020 [US2] Implement candidate form inputs, source badges, and autocomplete interactions in src/components/TurretSimulationModal.tsx
- [X] T021 [US2] Apply validation errors and manual override flows in src/components/TurretSimulationModal.tsx and src/utils/turretSimulationValidation.ts

**Checkpoint**: User Story 2 is independently functional and the modal reaches a runnable draft with minimal manual input.

---

## 1.5. Phase 5: User Story 3 - Inspect Simulation Outcomes Safely (Priority: P3)

**Goal**: Execute a non-mutating simulation against the deployed extension, preserve the operator draft across reruns, and render successful, empty, and failed outcomes clearly.

**Independent Test**: Submit valid and invalid simulation drafts and confirm the modal shows decoded targeting results for success, a distinct empty-result state for `[]`, and preserved inputs plus actionable errors for failed runs.

### 1.5.1. Tests For User Story 3

**NOTE**: Write these tests first and confirm they fail before implementation.

- [X] T022 [P] [US3] Add BCS candidate and result codec coverage in `src/__tests__/turretSimulationCodec.test.ts`
- [X] T023 [P] [US3] Add dev-inspect execution and error classification coverage in `src/__tests__/turretSimulationExecution.test.ts`
- [X] T024 [P] [US3] Add end-to-end simulation flow coverage in `tests/e2e/authorize.spec.ts`

### 1.5.2. Implementation For User Story 3

- [X] T025 [US3] Implement candidate and result BCS codecs in `src/utils/turretSimulationCodec.ts`
- [X] T026 [US3] Implement non-mutating dev-inspect execution in `src/utils/turretSimulationExecution.ts`
- [X] T027 [US3] Connect run, rerun, and preserved-draft lifecycle handling in `src/hooks/useTurretSimulation.ts`
- [X] T028 [US3] Render decoded results, empty-result messaging, and execution failures in `src/components/TurretSimulationModal.tsx`
- [X] T029 [US3] Wire simulation execution actions into `src/components/AuthorizeView.tsx` and `src/components/TurretSimulationModal.tsx`

**Checkpoint**: User Story 3 is independently functional and operators can compare repeated runs without leaving the modal.

---

## 1.6. Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tighten regression coverage, developer workflow guidance, and cross-story UX details.

- [X] T030 [P] Update developer verification and workflow notes in `specs/018-simulate-turret-inputs/quickstart.md`
- [X] T031 [P] Add regression coverage for stale-context blocking and non-mutating execution in `src/__tests__/AuthorizeView.test.tsx` and `tests/e2e/authorize.spec.ts`
- [X] T032 [P] Align implementation details with the simulation interface contract in `specs/018-simulate-turret-inputs/contracts/interfaces.md`
- [X] T033 Run quickstart validation and capture any implementation-specific adjustments in `specs/018-simulate-turret-inputs/quickstart.md`

---

## 1.7. Dependencies & Execution Order

### 1.7.1. Phase Dependencies

- **Phase 1: Setup** has no dependencies and can start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user-story work.
- **Phase 3: User Story 1** depends on Phase 2 and is the MVP slice.
- **Phase 4: User Story 2** depends on Phase 2, with UI integration tasks building on the modal shell from User Story 1.
- **Phase 5: User Story 3** depends on Phase 2, with modal execution wiring building on the draft flow from User Story 2.
- **Phase 6: Polish** depends on the user stories that are in scope for release.

### 1.7.2. User Story Dependencies

- **US1** can begin as soon as Foundational is complete.
- **US2** can begin after Foundational, but T020 and T021 assume the US1 modal shell from T012 and T013 exists.
- **US3** can begin after Foundational, but T027 through T029 assume the runnable draft flow from T017 through T021 exists.

### 1.7.3. Within Each User Story

- Write tests first and verify they fail.
- Implement UI shell and state plumbing before field or execution integration.
- Complete the story and validate it independently before moving to the next priority.

---

## 1.8. Parallel Opportunities

- Phase 1 parallel work: T002 and T003
- Phase 2 parallel work: T004 and T005
- US1 parallel work: T007, T008, and T009
- US2 parallel work: T014, T015, and T016, then T018 and T019
- US3 parallel work: T022, T023, and T024, then T025 and T026
- Polish parallel work: T030, T031, and T032

### 1.8.1. Parallel Example: User Story 1

```text
T007 [US1] src/__tests__/AuthorizeTurretItem.test.tsx
T008 [US1] src/__tests__/AuthorizeView.test.tsx
T009 [US1] src/__tests__/TurretSimulationModal.test.tsx
```

### 1.8.2. Parallel Example: User Story 2

```text
T018 [US2] src/utils/turretSimulationQueries.ts
T019 [US2] src/utils/authorizationTransaction.ts and src/utils/turretQueries.ts
```

### 1.8.3. Parallel Example: User Story 3

```text
T022 [US3] src/__tests__/turretSimulationCodec.test.ts
T023 [US3] src/__tests__/turretSimulationExecution.test.ts
T024 [US3] tests/e2e/authorize.spec.ts
```

---

## 1.9. Implementation Strategy

### 1.9.1. MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 for User Story 1.
4. Validate the Authorize-row modal launch and stale-context handling before expanding the feature.

### 1.9.2. Incremental Delivery

1. Deliver US1 to establish row action, modal shell, and live context safety.
2. Add US2 to reduce operator input through prefill and autocomplete.
3. Add US3 to execute and visualize the simulation path.
4. Finish with polish, quickstart verification, and regression coverage.

### 1.9.3. Suggested MVP Scope

The recommended MVP is **User Story 1 only** after Setup and Foundational work, because it proves the row-level entry point, modal ownership model, and stale-context safeguards that the later stories depend on.
