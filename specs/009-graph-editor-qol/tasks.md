# Tasks: Graph Editor QoL

**Input**: Design documents from `/specs/009-graph-editor-qol/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

`__tests__`: Tests are required for this feature because the constitution mandates TDD for new UX work and the plan explicitly calls for Vitest interaction coverage.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g. `[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared test utilities and common graph-interaction types before feature work starts.

- [X] T001 [P] Add shared graph interaction test helpers in src/test/graphInteractionTestUtils.ts
- [X] T002 [P] Add shared canvas interaction and delete-state types in src/types/nodes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared canvas and node plumbing that all user stories depend on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Implement shared selection target and delete action orchestration in src/components/CanvasWorkspace.tsx
- [X] T004 Implement shared node chrome state plumbing for diagnostics and inline actions in src/nodes/BaseNode.tsx
- [X] T005 Implement shared graph QoL style tokens and React Flow selectors in src/index.css

**Checkpoint**: Shared graph interaction plumbing is ready; user story implementation can proceed.

---

## Phase 3: User Story 1 - Safer Editing and Deletion (Priority: P1) 🎯 MVP

**Goal**: Deliver inline node delete controls, edge midpoint deletion, keyboard deletion, and target-specific delete actions in context menus.

**Independent Test**: Open an existing graph, delete a node through confirm/cancel and `Shift` bypass flows, delete a selected edge from its midpoint button and context menu, and remove the active selection with `Delete` or `Backspace`.

### Tests for User Story 1 ⚠️

**NOTE: Write these tests first, ensure they fail before implementation.**

- [X] T006 [P] [US1] Add node action tests for delete confirmation, cancel, and immediate delete in `src/__tests__/BaseNode.test.tsx`
- [X] T007 [P] [US1] Add canvas interaction tests for node delete, edge delete, keyboard delete, and target-specific context-menu actions in `src/__tests__/canvasFlow.test.tsx`

### Implementation for User Story 1

- [X] T008 [US1] Implement inline node delete controls and confirmation rendering in `src/nodes/BaseNode.tsx`
- [X] T009 [US1] Implement node and edge deletion handlers, midpoint edge delete affordance, and keyboard delete guards in `src/components/CanvasWorkspace.tsx`
- [X] T010 [US1] Implement node and edge Delete actions in the target-sensitive context menu in `src/components/CanvasWorkspace.tsx`
- [X] T011 [US1] Add inline delete, confirmation, midpoint action, and selected-target styles in `src/index.css`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Clear Focus and Navigation Cues (Priority: P2)

**Goal**: Deliver persistent themed scrollbars, selected target glow states, and error-state warning icon feedback on nodes.

**Independent Test**: Load overflowing editor regions, verify scrollbars remain visible, select a node and an edge to confirm glow states, and force a node into an error state to confirm warning-icon and hover-message behavior.

### Tests for User Story 2 ⚠️

- [X] T012 [P] [US2] Add node diagnostic presentation tests for warning-icon replacement and hover error content in `src/__tests__/BaseNode.test.tsx`
- [X] T013 [P] [US2] Add canvas interaction tests for selected target glow behavior and keyboard-delete focus guards in `src/__tests__/canvasFlow.test.tsx`

### Implementation for User Story 2

- [X] T014 [US2] Implement error-state warning icon and accessible hover or focus diagnostic messaging in `src/nodes/BaseNode.tsx`
- [X] T015 [US2] Wire diagnostic severity and presentation state into rendered node data in src/components/CanvasWorkspace.tsx
- [X] T016 [US2] Implement persistent themed scrollbars, edit-button hover glow, and selected node and edge glow styles in src/index.css

**Checkpoint**: User Stories 1 and 2 both work independently and can be validated without toolbox changes.

---

## Phase 5: User Story 3 - Faster Toolbox Discovery (Priority: P3)

**Goal**: Split the overloaded data toolbox grouping into `Static Data` and `Data Extractor` while preserving the accordion interaction model.

**Independent Test**: Open the toolbox, verify the top-level order is `Event Trigger`, `Static Data`, `Data Extractor`, `Logic`, and `Action`, and confirm that the former data-accessor nodes appear under the correct new category.

### Tests for User Story 3 ⚠️

- [X] T017 [P] [US3] Add sidebar accordion tests for top-level category order and labels in `src/__tests__/Sidebar.test.tsx`
- [X] T018 [P] [US3] Add node taxonomy tests for `static-data` and `data-extractor` assignments in `src/__tests__/nodeDefinitions.test.ts`

### Implementation for User Story 3

- [X] T019 [P] [US3] Extend node category types for `static-data` and `data-extractor` in src/types/nodes.ts
- [X] T020 [US3] Reassign former `data-accessor` node definitions to the new categories in src/data/node-definitions.ts
- [X] T021 [US3] Update toolbox accordion order and labels for `Static Data` and `Data Extractor` in src/components/Sidebar.tsx

**Checkpoint**: User Stories 1, 2, and 3 are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-surface regression protection.

- [X] T022 [P] Add browser-level regression coverage for graph editor QoL flows in tests/e2e/graph-editor-qol.spec.ts
- [X] T023 Run lint, typecheck, unit tests, and quickstart validation commands documented in specs/009-graph-editor-qol/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies; starts immediately.
- **Phase 2: Foundational**: Depends on Phase 1; blocks all user stories.
- **Phase 3: US1**: Depends on Phase 2; establishes the MVP.
- **Phase 4: US2**: Depends on Phase 2 and can land after or alongside US1, but should integrate the shared node and canvas plumbing from the foundational phase.
- **Phase 5: US3**: Depends on Phase 2 and can proceed independently of US1 and US2 once shared types are in place.
- **Phase 6: Polish**: Depends on completion of all desired user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after foundational work; no dependency on US2 or US3.
- **US2 (P2)**: Starts after foundational work; reuses shared node and canvas plumbing but remains independently testable.
- **US3 (P3)**: Starts after foundational work; depends only on shared type groundwork and remains independently testable.

### Within Each User Story

- Write tests first and confirm they fail.
- Implement component or data-model changes before integrating them into canvas orchestration.
- Add or refine CSS after the behavior exists so visual state can be validated against concrete DOM hooks.
- Validate the story independently before moving to the next priority.

### Parallel Opportunities

- `T001` and `T002` can run in parallel.
- `T006` and `T007` can run in parallel for US1.
- `T012` and `T013` can run in parallel for US2.
- `T017` and `T018` can run in parallel for US3.
- `T019` can run in parallel with `T017` and `T018` because it touches a separate file.
- `T022` can run in parallel with final validation once all core implementation tasks are complete.

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
Task: "Add node action tests for delete confirmation, cancel, and immediate delete in src/__tests__/BaseNode.test.tsx"
Task: "Add canvas interaction tests for node delete, edge delete, keyboard delete, and target-specific context-menu actions in src/__tests__/canvasFlow.test.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch US2 tests together:
Task: "Add node diagnostic presentation tests for warning-icon replacement and hover error content in src/__tests__/BaseNode.test.tsx"
Task: "Add canvas interaction tests for selected target glow behavior and keyboard-delete focus guards in src/__tests__/canvasFlow.test.tsx"
```

## Parallel Example: User Story 3

```bash
# Launch US3 taxonomy work together where files do not overlap:
Task: "Add sidebar accordion tests for top-level category order and labels in src/__tests__/Sidebar.test.tsx"
Task: "Add node taxonomy tests for `static-data` and `data-extractor` assignments in src/__tests__/nodeDefinitions.test.ts"
Task: "Extend node category types for `static-data` and `data-extractor` in src/types/nodes.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate node and edge deletion flows independently.
5. Demo the MVP before continuing.

### Incremental Delivery

1. Finish Setup + Foundational to establish shared graph plumbing.
2. Deliver US1 for safe edit and delete flows.
3. Add US2 for visual feedback and error-state communication.
4. Add US3 for toolbox discoverability.
5. Finish with cross-browser and regression validation.

### Parallel Team Strategy

1. One developer handles Phase 1 and Phase 2.
2. After foundational work completes:
   - Developer A can execute US1.
   - Developer B can execute US2.
   - Developer C can execute US3.
3. Rejoin for Phase 6 validation.

---

## Notes

- `[P]` tasks touch different files and have no incomplete-task dependency.
- Every user story is structured to be independently testable.
- Tests should use fake timers for the 15-second confirmation timeout.
- Keep Tailwind for local component layout and `src/index.css` for React Flow selectors, scrollbar styling, and graph chrome.
