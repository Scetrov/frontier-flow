# Tasks: Contract-Aligned Nodes

**Input**: Design documents from `/specs/005-contract-aligned-nodes/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Test tasks are included because the feature specification explicitly requires unit coverage for every node definition, compatibility validation for drag-and-drop graph assembly, and regression coverage for updated browser flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the shared definition and rendering scaffolding needed for the 29-node migration.

- [X] T001 Replace the placeholder node inventory scaffold with the contract-aligned 29-node catalogue structure in src/data/node-definitions.ts
- [X] T002 [P] Create the factory-based node renderer and semantic icon map in src/nodes/createNode.tsx
- [X] T003 [P] Convert the React Flow node registry to a definition-driven export in src/nodes/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the shared runtime assumptions that every contract-aligned node story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Confirm the expanded node set fits the existing shared typing contracts in src/types/nodes.ts and src/utils/socketTypes.ts
- [X] T005 [P] Update canvas empty-state copy and drop-time definition lookup assumptions for the contract-aligned palette in src/components/CanvasWorkspace.tsx

**Checkpoint**: The project has a definition-driven node registry, a factory renderer, and runtime scaffolding that can host the expanded node catalogue.

---

## Phase 3: User Story 1 - Contract-Accurate Node Palette in Sidebar (Priority: P1) 🎯 MVP

**Goal**: Users see a trustworthy sidebar palette whose node labels, categories, colours, and socket metadata map directly to the turret strategy contract concepts.

**Independent Test**: Open the sidebar and verify it contains exactly the contract-aligned node catalogue in category order, with representative node cards exposing the expected labels and drag metadata.

### Tests for User Story 1

- [X] T006 [US1] Expand sidebar rendering and drag-metadata coverage for the contract-aligned palette in src/**tests**/Sidebar.test.tsx

### Implementation for User Story 1

- [X] T007 [US1] Implement the full 29-node contract catalogue, stable type identifiers, descriptions, colours, and socket metadata in src/data/node-definitions.ts
- [X] T008 [US1] Adjust sidebar presentation for the expanded contract-aligned palette in src/components/Sidebar.tsx

**Checkpoint**: User Story 1 is fully functional and independently testable from the sidebar alone.

---

## Phase 4: User Story 2 - Drag-and-Drop Contract Nodes onto the Canvas (Priority: P1)

**Goal**: Users can drag any contract-aligned node onto the canvas, see it render through BaseNode, and connect compatible sockets while incompatible links are rejected.

**Independent Test**: Drag representative event, accessor, logic, data-source, and action nodes onto the canvas, then verify valid `target` connections succeed while incompatible `number` to `tribe` connections fail.

### Tests for User Story 2

- [X] T009 [P] [US2] Expand canvas drag-and-drop rendering coverage for representative contract nodes and repeated drops in src/**tests**/canvasFlow.test.tsx
- [X] T010 [P] [US2] Add socket compatibility regression coverage for valid `target` links, invalid `number` to `tribe` links, and `any` passthrough rules in src/**tests**/socketTypes.test.ts
- [X] T011 [P] [US2] Add Playwright coverage for dragging contract nodes from the toolbox onto the canvas in tests/e2e/canvas.spec.ts

### Implementation for User Story 2

- [X] T012 [US2] Render every contract-aligned node through BaseNode via the factory and registry in src/nodes/createNode.tsx, src/nodes/index.ts, and src/components/CanvasWorkspace.tsx
- [X] T013 [US2] Preserve typed connection validation and source-coloured edge styling for the expanded node set in src/utils/socketTypes.ts and src/components/CanvasWorkspace.tsx

**Checkpoint**: User Story 2 is fully functional and independently testable on the canvas.

---

## Phase 5: User Story 3 - Remove Obsolete Placeholder Nodes (Priority: P2)

**Goal**: The application no longer ships placeholder node types, and serialized graphs that reference removed types fail gracefully instead of crashing.

**Independent Test**: Verify the sidebar contains only the contract-aligned node set, then load or simulate an unknown node type and confirm the canvas omits or warns about it without throwing.

### Tests for User Story 3

- [X] T014 [US3] Add regression coverage for removed placeholder types and unknown serialized node types in src/**tests**/canvasFlow.test.tsx

### Implementation for User Story 3

- [X] T015 [US3] Delete the obsolete placeholder node components in src/nodes/AggressionNode.tsx, src/nodes/ProximityNode.tsx, src/nodes/GetTribeNode.tsx, src/nodes/ListOfTribeNode.tsx, src/nodes/IsInListNode.tsx, src/nodes/AddToQueueNode.tsx, src/nodes/HpRatioNode.tsx, src/nodes/ShieldRatioNode.tsx, and src/nodes/ArmorRatioNode.tsx
- [X] T016 [US3] Gracefully omit or warn on unknown saved node types in src/components/CanvasWorkspace.tsx and src/data/node-definitions.ts

**Checkpoint**: User Story 3 is fully functional and independently testable against migration edge cases.

---

## Phase 6: User Story 4 - Node Definitions Are Unit-Tested for Accuracy (Priority: P2)

**Goal**: The full contract-aligned node catalogue is protected by exhaustive unit coverage and a stable canonical type-list guard.

**Independent Test**: Run the unit suite and confirm that every node definition is validated for label, description, category, colour, and socket configuration, and that type list changes fail the canonical snapshot.

### Tests for User Story 4

- [X] T017 [US4] Rewrite src/**tests**/nodeDefinitions.test.ts to assert all 29 node definitions, their presentation metadata, and their full socket lists
- [X] T018 [US4] Add the canonical expected node type list guard in src/**tests**/nodeDefinitions.test.ts

### Implementation for User Story 4

- [X] T019 [US4] Parameterize the node definition fixtures and shared expectations in src/**tests**/nodeDefinitions.test.ts

**Checkpoint**: User Story 4 is fully functional and independently testable through the unit suite.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation and run the full validation stack across the migrated node system.

- [X] T020 [P] Update specs/005-contract-aligned-nodes/quickstart.md with final verification steps for the 29-node palette, typed connections, and unknown-node handling
- [X] T021 [P] Run `bun run test:run` and `bun run test:e2e` to validate the contract-aligned node migration
- [X] T022 [P] Run `bun run lint`, `bun run typecheck`, and `bun run build` to confirm the migration is production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories until the factory renderer, registry, and runtime assumptions are in place
- **US1 (Phase 3)**: Depends on Foundational and is the recommended MVP because the contract-aligned palette is the base deliverable
- **US2 (Phase 4)**: Depends on US1 because drag-and-drop requires the final contract-aligned palette to exist first
- **US3 (Phase 5)**: Depends on US1 and US2 because placeholder removal and unknown-type handling are validated against the migrated runtime
- **US4 (Phase 6)**: Depends on US1 because exhaustive unit coverage must target the final 29-node catalogue
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational and delivers the trustworthy contract-aligned node palette
- **US2 (P1)**: Requires the US1 definitions so drag-and-drop and connection rules operate on the final node set
- **US3 (P2)**: Requires the US1 and US2 runtime so obsolete-node removal and graceful omission paths can be regression-tested
- **US4 (P2)**: Requires the US1 catalogue so exhaustive node-definition assertions target the final source of truth

### Within Each User Story

- Write the story test tasks first and ensure they fail before implementation
- Finish shared data or utility updates before wiring them into the React Flow runtime
- Validate each story at its checkpoint before moving to the next priority

### Parallel Opportunities

- T002 and T003 can run in parallel after T001 because they touch separate runtime files
- T004 and T005 can run in parallel after Setup because they update different shared surfaces
- T009, T010, and T011 can run in parallel for US2 test coverage
- T012 and T013 should run sequentially because connection validation depends on the rendered node set being in place
- T020, T021, and T022 can run in parallel once implementation is complete

---

## Parallel Example: User Story 1

```text
Task T006: "Expand sidebar rendering and drag-metadata coverage for the contract-aligned palette in src/__tests__/Sidebar.test.tsx"
```

## Parallel Example: User Story 2

```text
Task T009: "Expand canvas drag-and-drop rendering coverage for representative contract nodes and repeated drops in src/__tests__/canvasFlow.test.tsx"
Task T010: "Add socket compatibility regression coverage for valid target links, invalid number to tribe links, and any passthrough rules in src/__tests__/socketTypes.test.ts"
Task T011: "Add Playwright coverage for dragging contract nodes from the toolbox onto the canvas in tests/e2e/canvas.spec.ts"
```

## Parallel Example: User Story 3

```text
Task T014: "Add regression coverage for removed placeholder types and unknown serialized node types in src/__tests__/canvasFlow.test.tsx"
```

## Parallel Example: User Story 4

```text
Task T017: "Rewrite src/__tests__/nodeDefinitions.test.ts to assert all 29 node definitions, their presentation metadata, and their full socket lists"
Task T018: "Add the canonical expected node type list guard in src/__tests__/nodeDefinitions.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T008)
4. **STOP and VALIDATE**: Confirm the sidebar exposes the full contract-aligned palette in the required category order

### Incremental Delivery

1. Deliver Setup + Foundational so the factory-based node runtime is ready
2. Deliver US1 so the contract-aligned palette becomes the new source of truth
3. Deliver US2 so builders can place and connect the expanded node set on the canvas
4. Deliver US3 so obsolete placeholders are removed safely and migration edge cases are handled
5. Deliver US4 so exhaustive unit coverage protects the node catalogue from regression
6. Finish with Polish to validate quickstart steps and all automated checks

### Parallel Team Strategy

1. One developer can land T001 while another prepares T002 or T003 once the catalogue shape is agreed
2. After Foundational completes, UI test work for US2 can proceed in parallel with the unit-test work for US4
3. Placeholder cleanup in US3 can proceed after the factory-based runtime from US2 is stable

---

## Notes

- [P] tasks touch different files or can be executed independently after prerequisites are satisfied
- No separate contracts/ directory exists under specs/005-contract-aligned-nodes/, so contract-derived behaviour is sourced from spec.md, research.md, data-model.md, quickstart.md, and docs/CONTRACTS.md
- The task list stays within the planned surface area from plan.md: src/data/node-definitions.ts, src/nodes/, src/components/CanvasWorkspace.tsx, src/components/Sidebar.tsx, src/types/nodes.ts, src/utils/socketTypes.ts, src/**tests**/, tests/e2e/, and specs/005-contract-aligned-nodes/quickstart.md
