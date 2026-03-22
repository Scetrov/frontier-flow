# Tasks: Graph To Move Generation

**Input**: Design documents from `/specs/007-graph-to-move/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

`__tests__`: Tests are required for this feature because the specification and constitution explicitly require deterministic code-generation coverage, unsupported-graph failure coverage, and compiler workflow validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently once shared prerequisites are complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared reference fixtures and test inputs for graph-to-Move work.

- [x] T001 Create supported and unsupported graph fixtures in src/**fixtures**/graphs/graph-to-move-supported.json and src/**fixtures**/graphs/graph-to-move-unsupported.json
- [x] T002 [P] Create golden Move package fixtures in src/**fixtures**/move/graph-to-move-supported.move and src/**fixtures**/move/graph-to-move-minimal.move
- [x] T003 [P] Add package compile and compiler-error fixture payloads in src/**fixtures**/compiler/graph-to-move-bytecode.ts and src/**fixtures**/compiler/graph-to-move-errors.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared compiler contracts and artifact plumbing that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T004 Extend graph-to-Move domain types in src/compiler/types.ts
- [x] T005 [P] Add shared package-artifact emission helpers in src/compiler/generators/shared.ts
- [x] T006 [P] Register supported-node coverage metadata in src/compiler/generators/index.ts
- [x] T007 Wire generated artifact boundaries through src/compiler/emitter.ts, src/compiler/pipeline.ts, and src/compiler/moveCompiler.ts
- [x] T008 Connect artifact-aware pipeline results to the canvas compile lifecycle in src/hooks/useAutoCompile.ts and src/components/CanvasWorkspace.tsx

**Checkpoint**: The compiler pipeline can now emit and transport a generated package artifact shape for all user stories.

---

## Phase 3: User Story 1 - Generate a real contract from a supported graph (Priority: P1) 🎯 MVP

**Goal**: Turn a supported graph into a deterministic Move package artifact that represents the graph's behavior.

**Independent Test**: Load the supported fixture graph, run the pipeline, and verify it emits the expected Move package artifact and golden Move output for the same graph on repeated runs.

### Tests for User Story 1 ⚠️

**NOTE: Write these tests first and verify they fail before implementation.**

- [x] T009 [P] [US1] Add supported event-trigger emission cases in `src/__tests__/compiler/generators/eventTriggers.test.ts`
- [x] T010 [P] [US1] Add supported data-source and accessor emission cases in `src/__tests__/compiler/generators/dataSources.test.ts` and `src/__tests__/compiler/generators/dataAccessors.test.ts`
- [x] T011 [P] [US1] Add supported logic, action, and golden-output contract cases in `src/__tests__/compiler/generators/logicGates.test.ts`, `src/__tests__/compiler/generators/actions.test.ts`, `src/__tests__/compiler/generators/scoringModifiers.test.ts`, and `src/__tests__/compiler/emitter.test.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement supported event-trigger Move emission in `src/compiler/generators/eventTriggers.ts`
- [x] T013 [P] [US1] Implement supported data-source and accessor Move emission in `src/compiler/generators/dataSources.ts` and `src/compiler/generators/dataAccessors.ts`
- [x] T014 [P] [US1] Implement supported logic-gate, action, and scoring Move emission in `src/compiler/generators/logicGates.ts`, `src/compiler/generators/actions.ts`, and `src/compiler/generators/scoringModifiers.ts`
- [x] T015 [US1] Emit a complete Move package artifact with stable source-map sections in `src/compiler/emitter.ts`
- [x] T016 [US1] Finalize supported-graph artifact generation flow in `src/compiler/pipeline.ts`
- [x] T017 [US1] Add end-to-end supported graph pipeline coverage in `src/__tests__/compiler/pipeline.test.ts`

**Checkpoint**: User Story 1 is complete when a supported graph deterministically emits a real Move package artifact and passes golden-output tests.

---

## Phase 4: User Story 2 - Know when a graph cannot become real Move yet (Priority: P1)

**Goal**: Stop unsupported or incomplete graphs before emission and surface actionable blocking diagnostics.

**Independent Test**: Run unsupported-node, missing-input, disconnected-entry, and invalid-name fixtures through the pipeline and verify the build stops with graph-attributed diagnostics before successful compilation.

### Tests for User Story 2 ⚠️

- [x] T018 [P] [US2] Add unsupported-node and missing-input validation cases in `src/__tests__/compiler/validator.test.ts`
- [x] T019 [P] [US2] Add disconnected-entry-path and unresolved-order cases in `src/__tests__/compiler/irBuilder.test.ts`
- [x] T020 [P] [US2] Add identifier sanitization and invalid-name rejection cases in `src/__tests__/compiler/sanitizer.test.ts`

### Implementation for User Story 2

- [x] T021 [US2] Enforce supported-node subset diagnostics in `src/compiler/validator.ts`
- [x] T022 [US2] Detect disconnected entry paths and unresolved graph ordering in `src/compiler/irBuilder.ts` and `src/compiler/validator.ts`
- [x] T023 [US2] Harden graph-derived identifier sanitization in `src/compiler/sanitizer.ts`
- [x] T024 [US2] Stop artifact emission and compilation on blocking generation diagnostics in `src/compiler/pipeline.ts`

**Checkpoint**: User Story 2 is complete when unsupported or incomplete graphs fail clearly before successful compilation with diagnostics tied back to graph elements.

---

## Phase 5: User Story 3 - Review generated Move before or after compile (Priority: P2)

**Goal**: Show the artifact-backed generated Move source in a readable, stable preview workflow.

**Independent Test**: Generate a supported graph artifact, open the Move source view, and verify the preview shows readable generated Move with stable section ordering before and after subsequent graph edits.

### Tests for User Story 3 ⚠️

- [x] T025 [P] [US3] Add generated-source preview state coverage in `src/__tests__/MoveSourcePanel.test.tsx`
- [x] T026 [P] [US3] Add app-level generated-source handoff coverage in `src/__tests__/App.compilation.test.tsx`

### Implementation for User Story 3

- [x] T027 [US3] Pass artifact-backed generated source through `src/App.tsx` and `src/components/CanvasWorkspace.tsx`
- [x] T028 [US3] Render readable generated Move and empty/error preview states in src/components/MoveSourcePanel.tsx
- [x] T029 [US3] Stabilize emitted section ordering and readable formatting in src/compiler/emitter.ts and src/compiler/types.ts

**Checkpoint**: User Story 3 is complete when users can inspect stable generated Move sourced directly from the real artifact workflow.

---

## Phase 6: User Story 4 - Compile a real artifact from generated Move (Priority: P2)

**Goal**: Compile the generated package artifact through the WASM Sui Move compiler and surface the resulting status and diagnostics.

**Independent Test**: Trigger manual and auto compile on a supported graph, verify the WASM compiler receives the generated package files, and confirm success and failure states are surfaced through the existing build UI.

### Tests for User Story 4 ⚠️

- [x] T030 [P] [US4] Add artifact-package compile success and failure cases in `src/__tests__/compiler/pipeline.test.ts` and `src/__tests__/compiler/moveCompiler.test.ts`
- [x] T031 [P] [US4] Add manual build and footer status coverage in `src/__tests__/Header.test.tsx` and `src/__tests__/Footer.test.tsx`
- [x] T032 [P] [US4] Add real-artifact compilation workflow coverage in `tests/e2e/compilation.spec.ts`

### Implementation for User Story 4

- [x] T033 [US4] Compile generated package files and decode artifact-linked compiler results in src/compiler/moveCompiler.ts
- [x] T034 [US4] Map compiler output back to generated artifact traces in src/compiler/errorParser.ts
- [x] T035 [US4] Preserve artifact-aware compile status and cancellation behavior in src/hooks/useAutoCompile.ts
- [x] T036 [US4] Wire manual build and footer diagnostics to real artifact compilation state in src/App.tsx, src/components/Header.tsx, and src/components/Footer.tsx

**Checkpoint**: User Story 4 is complete when manual and auto build both compile the generated package artifact and surface artifact-linked success or failure states.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and feature-level validation across stories.

- [x] T037 [P] Add compiler error-fallback and unmapped-line regression coverage in `src/**fixtures**/compiler/graph-to-move-errors.ts` and `src/__tests__/compiler/errorParser.test.ts`
- [x] T038 [P] Document the graph-to-Move workflow and test expectations in `docs/SOLUTION-DESIGN.md` and `docs/TESTING-STRATEGY.md`
- [x] T039 Validate the end-to-end feature scenarios against `specs/007-graph-to-move/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; establishes the MVP artifact-generation path.
- **User Story 2 (Phase 4)**: Depends on Foundational; can run in parallel with US1 if staffed, but should land before final compile UX validation.
- **User Story 3 (Phase 5)**: Depends on User Story 1 because preview must read the generated artifact.
- **User Story 4 (Phase 6)**: Depends on User Story 1 for artifact generation and User Story 2 for blocking diagnostics behavior.
- **Polish (Phase 7)**: Depends on all targeted user stories being complete.

### User Story Dependencies

- **US1**: No user story dependencies after Foundational.
- **US2**: No user story dependencies after Foundational.
- **US3**: Depends on US1 artifact generation.
- **US4**: Depends on US1 artifact generation and US2 diagnostic enforcement.

### Within Each User Story

- Tests must be written before implementation and observed failing first.
- Generator and validation primitives come before pipeline wiring that consumes them.
- Pipeline and UI handoff tasks come before story-level integration and workflow validation.
- Each story ends with an independent verification checkpoint.

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`.
- `T005` and `T006` can run in parallel after `T004`.
- `T009` through `T011` can run in parallel inside US1.
- `T012` through `T014` can run in parallel inside US1 once generator contracts are ready.
- `T018` through `T020` can run in parallel inside US2.
- `T025` and `T026` can run in parallel inside US3.
- `T030` through `T032` can run in parallel inside US4.
- `T037` and `T038` can run in parallel during Polish.

---

## Parallel Example: User Story 1

```bash
Task: "T009 [US1] Add supported event-trigger emission cases in src/__tests__/compiler/generators/eventTriggers.test.ts"
Task: "T010 [US1] Add supported data-source and accessor emission cases in src/__tests__/compiler/generators/dataSources.test.ts and src/__tests__/compiler/generators/dataAccessors.test.ts"
Task: "T011 [US1] Add supported logic, action, and golden-output contract cases in src/__tests__/compiler/generators/logicGates.test.ts, src/__tests__/compiler/generators/actions.test.ts, src/__tests__/compiler/generators/scoringModifiers.test.ts, and src/__tests__/compiler/emitter.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T018 [US2] Add unsupported-node and missing-input validation cases in src/__tests__/compiler/validator.test.ts"
Task: "T019 [US2] Add disconnected-entry-path and unresolved-order cases in src/__tests__/compiler/irBuilder.test.ts"
Task: "T020 [US2] Add identifier sanitization and invalid-name rejection cases in src/__tests__/compiler/sanitizer.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T030 [US4] Add artifact-package compile success and failure cases in src/__tests__/compiler/pipeline.test.ts and src/__tests__/compiler/moveCompiler.test.ts"
Task: "T031 [US4] Add manual build and footer status coverage in src/__tests__/Header.test.tsx and src/__tests__/Footer.test.tsx"
Task: "T032 [US4] Add real-artifact compilation workflow coverage in tests/e2e/compilation.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate the supported-graph artifact generation path before adding more behavior.

### Incremental Delivery

1. Deliver US1 to prove deterministic real Move artifact generation.
2. Deliver US2 to make unsupported graphs fail safely and explainably.
3. Deliver US3 to expose the artifact-backed generated source to users.
4. Deliver US4 to ensure both manual and auto build compile the real package artifact through WASM.
5. Finish with Phase 7 hardening and documentation.

### Parallel Team Strategy

1. One developer completes Setup and Foundational tasks.
2. After Foundational, one developer can drive US1 while another drives US2.
3. Once US1 lands, US3 can proceed in parallel with final US4 build-path work.

---

## Notes

- `[P]` tasks touch separate files or isolated file groups and are safe to parallelize.
- `[US1]` through `[US4]` map directly to the user stories in `spec.md`.
- The task list assumes the current in-browser WASM Sui Move compiler remains the only compile backend for this feature.
- `T039` is the final end-to-end verification gate before implementation is considered complete.
