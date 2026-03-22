# Tasks: ReactFlow Canvas Node Components

**Input**: Design documents from `/specs/004-reactflow-canvas-nodes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

`__tests__`: Test tasks are included because the feature spec and implementation plan explicitly require Vitest and Playwright coverage for node rendering, drag-and-drop, typed connections, cycle prevention, canonical flow assembly, and deletion behaviour.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the shared type, registry, and socket metadata infrastructure used by every canvas story.

- [X] T001 Extend shared node typing interfaces in src/types/nodes.ts with `SocketType`, `SocketDefinition`, `NodeCategory`, and ReactFlow node runtime data
- [X] T002 [P] Create typed socket compatibility helpers and socket colour lookup utilities in src/utils/socketTypes.ts
- [X] T003 [P] Replace the placeholder toolbox data with the 9 verified node definitions and contract-backed socket metadata in src/data/node-definitions.ts
- [X] T004 [P] Create the ReactFlow node registry in src/nodes/index.ts exporting the custom node type map for the verified node set

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared canvas shell, toolbox integration, and styling required before any story-specific behaviour can land.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Update src/index.css with shared ReactFlow canvas, node chrome, handle, and animated edge classes used across all stories
- [X] T006 [P] Update src/components/Sidebar.tsx to render the verified 9-node toolbox from extended node metadata and preserve the drag payload contract for canvas drops
- [X] T007 Update src/App.tsx to replace the static hero section with a ReactFlowProvider canvas shell, blank node/edge state, drop target wiring, and selection support

**Checkpoint**: The application has a live empty canvas, a verified toolbox, and the shared styling needed for story work.

---

## Phase 3: User Story 1 - Drag and Drop Verified Nodes onto the Canvas (Priority: P1) 🎯 MVP

**Goal**: Builders can drag any of the 9 verified node types from the sidebar onto the ReactFlow canvas and see the correctly styled custom node with contract-backed sockets.

**Independent Test**: Drag each verified node type from the sidebar onto an empty canvas and confirm the rendered node shows the correct title, icon, sockets, socket labels, and socket colours.

### Tests for User Story 1

- [X] T008 [P] [US1] Create node definition integrity tests in `src/__tests__/nodeDefinitions.test.ts` covering the 9 verified nodes, socket counts, and contract-backed metadata
- [X] T009 [P] [US1] Create drag-and-drop canvas interaction tests in `src/__tests__/canvasFlow.test.tsx` covering node placement, unique IDs, and rendered socket labels after sidebar drops
- [ ] T010 [P] [US1] Create Playwright node placement coverage in `tests/e2e/canvas.spec.ts` for dragging verified nodes onto the canvas and asserting headers, icons, and socket rendering

### Implementation for User Story 1

- [X] T011 [P] [US1] Create event trigger and accessor node components in src/nodes/ProximityNode.tsx, src/nodes/AggressionNode.tsx, src/nodes/GetTribeNode.tsx, src/nodes/HpRatioNode.tsx, src/nodes/ShieldRatioNode.tsx, and src/nodes/ArmorRatioNode.tsx
- [X] T012 [P] [US1] Create data source, logic gate, and action node components in src/nodes/ListOfTribeNode.tsx, src/nodes/IsInListNode.tsx, and src/nodes/AddToQueueNode.tsx
- [X] T013 [US1] Wire node creation, per-type data payloads, icon and header rendering, and drop-to-flow instantiation in src/App.tsx and src/nodes/index.ts

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - Connect Nodes with Type-Safe Edges (Priority: P2)

**Goal**: Builders can connect outputs to inputs only when the socket types are compatible, with immediate visual feedback and coloured animated edges for accepted connections.

**Independent Test**: Attempt compatible and incompatible connections across the verified node set and confirm only valid output-to-input pairs succeed, including `any` inputs and fan-out from one source socket.

### Tests for User Story 2

- [ ] T014 [P] [US2] Create socket compatibility unit tests in `src/__tests__/socketTypes.test.ts` covering same-type, cross-entity, `any`-type, and incompatible socket pairs
- [ ] T015 [P] [US2] Create connection validation tests in `src/__tests__/connectionValidation.test.ts` covering output-to-input rules, fan-out, invalid direction pairs, and cycle rejection
- [ ] T016 [P] [US2] Create Playwright typed-edge coverage in `tests/e2e/connections.spec.ts` for valid entity edges, `any`-input acceptance, invalid entity-to-vector rejection, and source-coloured edge styling

### Implementation for User Story 2

- [ ] T017 [US2] Implement connection validation, cycle detection, and source-socket edge styling in `src/utils/socketTypes.ts` and `src/App.tsx`
- [ ] T018 [US2] Update `src/index.css` to visually highlight valid targets, dim invalid handles, and animate colour-coded edges during connection drags in the ReactFlow canvas

**Checkpoint**: User Story 2 is fully functional and testable on its own.

---

## Phase 5: User Story 3 - Build a Complete Turret Targeting Flow (Priority: P3)

**Goal**: Builders can assemble the canonical friend-or-foe targeting graph and extend it with HP, Shield, and Armor ratio accessor nodes without breaking the directed acyclic flow.

**Independent Test**: Place Proximity, Get Tribe, List of Tribe, Is In List, and Add to Queue on the canvas, connect the canonical 6-edge flow, then attach HP Ratio, Shield Ratio, and Armor Ratio to the Proximity target output and verify every connection is accepted.

### Tests for User Story 3

- [ ] T019 [P] [US3] Create canonical flow assembly tests in `src/__tests__/canonicalFlow.test.tsx` covering Proximity -> Get Tribe -> List of Tribe -> Is In List -> Add to Queue plus HP, Shield, and Armor accessor attachments
- [ ] T020 [P] [US3] Extend `tests/e2e/canvas.spec.ts` to assemble the canonical friend-or-foe graph and verify the ratio accessor nodes connect cleanly from the Proximity target output

### Implementation for User Story 3

- [ ] T021 [US3] Finalize socket definitions, default node data, and canvas connection behaviour in `src/data/node-definitions.ts` and `src/App.tsx` so the canonical targeting flow assembles without orphaned critical-path sockets

**Checkpoint**: User Story 3 is fully functional and testable on its own.

---

## Phase 6: User Story 4 - Delete Nodes and Edges (Priority: P4)

**Goal**: Builders can remove selected nodes or edges from the canvas, and deleting a node also removes every connected edge.

**Independent Test**: Place and connect nodes, delete a selected node with Delete or Backspace, verify its connected edges are removed, then delete a selected edge without removing either node.

### Tests for User Story 4

- [ ] T022 [P] [US4] Create deletion interaction tests in `src/__tests__/deleteInteractions.test.tsx` covering keyboard node deletion, connected-edge cleanup, and selected-edge removal
- [ ] T023 [P] [US4] Extend `tests/e2e/canvas.spec.ts` with node and edge deletion journeys for Delete or Backspace and header delete button flows

### Implementation for User Story 4

- [ ] T024 [US4] Implement selected node and edge deletion plus connected-edge cleanup in src/App.tsx
- [ ] T025 [US4] Add node-header delete affordances and accessible delete labels in src/nodes/ProximityNode.tsx, src/nodes/AggressionNode.tsx, src/nodes/GetTribeNode.tsx, src/nodes/ListOfTribeNode.tsx, src/nodes/IsInListNode.tsx, src/nodes/AddToQueueNode.tsx, src/nodes/HpRatioNode.tsx, src/nodes/ShieldRatioNode.tsx, and src/nodes/ArmorRatioNode.tsx

**Checkpoint**: User Story 4 is fully functional and testable on its own.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and feature-wide regression checks.

- [ ] T026 [P] Update specs/004-reactflow-canvas-nodes/quickstart.md with final manual QA and automated verification steps for placement, typed connections, canonical flow assembly, and deletion
- [ ] T027 [P] Run `bun run test:run` and `bun run test:e2e` to validate the canvas feature unit and browser coverage
- [ ] T028 [P] Run `bun run lint`, `bun run typecheck`, and `bun run build` to confirm the feature is production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories until the live ReactFlow shell exists
- **US1 (Phase 3)**: Depends on Foundational and is the recommended MVP
- **US2 (Phase 4)**: Depends on Foundational and on the rendered node components from US1
- **US3 (Phase 5)**: Depends on US1 and US2 because the canonical flow requires the final node set plus validated typed connections
- **US4 (Phase 6)**: Depends on US1 because deletion operates on placed nodes and should be validated against connected edges from US2
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after the shared canvas shell, toolbox, and socket metadata infrastructure exist
- **US2 (P2)**: Requires the draggable custom nodes from US1 so typed connections can be exercised on real handles
- **US3 (P3)**: Requires US1 node placement and US2 connection rules to verify the complete canonical turret graph
- **US4 (P4)**: Requires US1 node placement and should also be regression-tested against the connection state introduced in US2

### Within Each User Story

- Write the story test tasks first and ensure they fail before implementation
- Finish shared data and utility updates before wiring them into the ReactFlow canvas
- Complete story-specific UI wiring after the underlying types, validation, and node components exist
- Validate each story at its checkpoint before moving to the next priority

### Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001 because they touch separate files
- T005 and T006 can run in parallel before T007 because shared styling and toolbox rendering are independent
- T008, T009, and T010 can run in parallel for US1 test coverage
- T011 and T012 can run in parallel because they touch different node component files
- T014, T015, and T016 can run in parallel for US2 test coverage
- T019 and T020 can run in parallel for US3 validation coverage
- T022 and T023 can run in parallel for US4 unit and end-to-end deletion coverage
- T026, T027, and T028 can run in parallel once implementation is complete

---

## Parallel Example: User Story 1

```text
Task T008: "Create node definition integrity tests in src/__tests__/nodeDefinitions.test.ts"
Task T009: "Create drag-and-drop canvas interaction tests in src/__tests__/canvasFlow.test.tsx"
Task T010: "Create Playwright node placement coverage in tests/e2e/canvas.spec.ts"
Task T011: "Create event trigger and accessor node components in src/nodes/ProximityNode.tsx, src/nodes/AggressionNode.tsx, src/nodes/GetTribeNode.tsx, src/nodes/HpRatioNode.tsx, src/nodes/ShieldRatioNode.tsx, and src/nodes/ArmorRatioNode.tsx"
Task T012: "Create data source, logic gate, and action node components in src/nodes/ListOfTribeNode.tsx, src/nodes/IsInListNode.tsx, and src/nodes/AddToQueueNode.tsx"
```

## Parallel Example: User Story 2

```text
Task T014: "Create socket compatibility unit tests in src/__tests__/socketTypes.test.ts"
Task T015: "Create connection validation tests in src/__tests__/connectionValidation.test.ts"
Task T016: "Create Playwright typed-edge coverage in tests/e2e/connections.spec.ts"
```

## Parallel Example: User Story 4

```text
Task T022: "Create deletion interaction tests in src/__tests__/deleteInteractions.test.tsx"
Task T023: "Extend tests/e2e/canvas.spec.ts with node and edge deletion journeys"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: User Story 1 (T008-T013)
4. **STOP and VALIDATE**: Confirm every verified node can be dragged onto the canvas with the expected header, icon, and sockets

### Incremental Delivery

1. Deliver Setup + Foundational to establish the ReactFlow shell, socket infrastructure, and verified toolbox data
2. Deliver US1 so builders can place the verified node set on the canvas
3. Deliver US2 so builders can create typed, cycle-safe connections with immediate feedback
4. Deliver US3 so the canonical turret targeting workflow can be assembled end to end
5. Deliver US4 so builders can edit the graph by deleting nodes and edges safely
6. Finish with Polish to validate quickstart steps, automated tests, lint, type-check, and build output

---

## Notes

- [P] tasks touch separate files or can be executed independently after prerequisites are satisfied
- No contracts phase is included because this feature defines no new API or backend interface under a contracts/ directory
- The task list stays within the planned surface area: src/App.tsx, src/index.css, src/components/Sidebar.tsx, src/types/nodes.ts, src/data/node-definitions.ts, src/utils/socketTypes.ts, src/nodes/, `src/__tests__/`, `tests/e2e/`, and `specs/004-reactflow-canvas-nodes/quickstart.md`
