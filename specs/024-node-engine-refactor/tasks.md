# Tasks: Node Engine Refactor

**Input**: Design documents from `/specs/024-node-engine-refactor/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/node-engine-refactor.md`, `quickstart.md`

**Tests**: Tests are required for this feature because the specification explicitly requires automated verification updates and green local checks.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Test Harness)

**Purpose**: Create failing shared regression coverage before shared implementation work begins.

- [X] T001 [P] Add failing shared catalog and toolbox regression coverage in `src/__tests__/nodeDefinitions.test.ts`, `src/__tests__/socketTypes.test.ts`, and `src/__tests__/Sidebar.test.tsx`
- [X] T002 [P] Add failing shared restore/compiler regression coverage in `src/__tests__/canvasFlow.test.tsx`, `src/__tests__/compiler/generators/actions.test.ts`, and `src/__tests__/compiler/irBuilder.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared catalog, hydration, compiler, and fixture plumbing after failing regressions exist.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T003 Update shared node catalog, authorable filtering, and render registration in `src/types/nodes.ts`, `src/data/node-definitions.ts`, and `src/nodes/createNode.tsx`
- [X] T004 [P] Update shared hydration, restore, and default fixture plumbing in `src/data/node-definitions.ts`, `src/components/restoreSavedFlow.ts`, and `src/data/kitchenSinkFlow.ts`
- [X] T005 [P] Update shared trigger/action compiler plumbing for socket changes in `src/compiler/generators/eventTriggers.ts`, `src/compiler/generators/actions.ts`, and `src/compiler/emitter.ts`

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - Use current trigger path (Priority: P1) 🎯 MVP

**Goal**: Deliver `Entered / Attacked` as current encounter trigger and remove legacy triggers from new authoring flows.

**Independent Test**: Open fresh graph, confirm toolbox shows `Entered / Attacked` but not `Aggression` or `Proximity`, then place node and verify downstream `priority` and `target` outputs exist.

### Tests for User Story 1

- [X] T006 [P] [US1] Add `enteredAttacked` catalog and socket coverage in `src/__tests__/nodeDefinitions.test.ts` and `src/__tests__/socketTypes.test.ts`
- [X] T007 [P] [US1] Add toolbox visibility coverage for `Entered / Attacked` and hidden legacy triggers in `src/__tests__/Sidebar.test.tsx`

### Implementation for User Story 1

- [X] T008 [US1] Implement `enteredAttacked` node metadata and legacy trigger deprecation details in `src/data/node-definitions.ts`
- [X] T009 [P] [US1] Register `enteredAttacked` icon/render support in `src/nodes/createNode.tsx`
- [X] T010 [US1] Update toolbox grouping and hidden-deprecated filtering in `src/components/Sidebar.tsx`

**Checkpoint**: User Story 1 should now support current trigger authoring without exposing legacy trigger choices.

---

## Phase 4: User Story 2 - Reopen older graphs safely (Priority: P1)

**Goal**: Preserve hydration and rendering of saved graphs that still contain `Aggression` or `Proximity`.

**Independent Test**: Restore representative saved graphs containing `aggression` and `proximity`, perform a post-reopen authoring edit, and verify nodes still render, remain editable, and round-trip persistence keeps the legacy nodes intact.

### Tests for User Story 2

- [X] T011 [P] [US2] Add legacy restore, post-reopen edit, and round-trip persistence coverage for `aggression` and `proximity` graphs in `src/__tests__/restoreSavedFlow.test.ts` and `src/__tests__/canvasFlow.test.tsx`

### Implementation for User Story 2

- [X] T012 [US2] Preserve legacy trigger hydration, editability after reopen, and remediation behavior in `src/data/node-definitions.ts` and `src/components/restoreSavedFlow.ts`
- [X] T013 [US2] Refresh persisted/default flow expectations and round-trip graph serialization coverage for legacy trigger compatibility in `src/data/kitchenSinkFlow.ts` and `src/__tests__/graphYaml.test.ts`

**Checkpoint**: User Story 2 should now restore legacy trigger graphs without breaking the new authoring path.

---

## Phase 5: User Story 3 - Build queue flows with fewer manual steps (Priority: P2)

**Goal**: Remove redundant queue output, rename queue-facing priority labels, and auto-wire a dropped `Add to Queue` from `Entered / Attacked`.

**Independent Test**: Place `Entered / Attacked` on a fresh canvas, drop `Add to Queue`, confirm deterministic `priority` and `target` auto-wiring, verify neither compatible input is overwritten when already connected, and verify no `Priority Out` port is rendered.

### Tests for User Story 3

- [X] T014 [P] [US3] Add auto-wiring and removed-port regression tests covering both compatible inputs, duplicate suppression, and pre-connected-input protection in `src/__tests__/canvasFlow.test.tsx` and `src/__tests__/compiler/irBuilder.test.ts`
- [X] T015 [P] [US3] Add queue terminology plus Playwright and `axe-core` workflow coverage for toolbox/drop auto-wiring in `src/__tests__/nodeDefinitions.test.ts`, `src/__tests__/Sidebar.test.tsx`, and `tests/e2e/canvas-workflow.spec.ts`

### Implementation for User Story 3

- [X] T016 [US3] Rename queue-facing `Priority` copy and remove `priority_out` from `addToQueue` in `src/data/node-definitions.ts`
- [X] T017 [US3] Implement deterministic `Add to Queue` auto-wiring on drop with guards for both `priority_in` and `target` inputs in `src/components/CanvasWorkspace.tsx`
- [X] T018 [US3] Remove public `priority_out` compiler assumptions in `src/compiler/generators/actions.ts` and `src/compiler/emitter.ts`

**Checkpoint**: User Story 3 should now make queue authoring faster without duplicate or conflicting auto-generated edges.

---

## Phase 6: User Story 4 - Keep queue weights valid (Priority: P2)

**Goal**: Canonicalize queue weight `0` to `100` across restore, save, and compile paths.

**Independent Test**: Set queue weight to `0`, restore or compile graph, and verify emitted/stored value is `100` while non-zero weights remain unchanged.

### Tests for User Story 4

- [X] T019 [P] [US4] Add zero-weight normalization unit coverage in `src/__tests__/nodeFieldCatalog.test.ts` and `src/__tests__/compiler/generators/actions.test.ts`
- [X] T020 [P] [US4] Add restore and canvas regression coverage for zero queue weights in `src/__tests__/restoreSavedFlow.test.ts` and `src/__tests__/canvasFlow.test.tsx`

### Implementation for User Story 4

- [X] T021 [US4] Normalize `addToQueue` zero weights in `src/data/nodeFieldCatalog.ts` and `src/data/node-definitions.ts`
- [X] T022 [US4] Thread normalized queue weights through restore, IR build, and action emission in `src/components/restoreSavedFlow.ts`, `src/compiler/irBuilder.ts`, and `src/compiler/generators/actions.ts`

**Checkpoint**: User Story 4 should now block zero queue weights from reaching persisted or compiled outputs.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Close remaining regressions and validate feature end-to-end.

- [X] T023 [P] Update remaining legacy-node and queue-label regression expectations in `src/__tests__/BaseNode.test.tsx` and `src/__tests__/graphDocument.test.ts`
- [X] T024 [P] Revalidate quickstart flow notes and final canvas assertions in `specs/024-node-engine-refactor/quickstart.md` and `src/__tests__/canvasFlow.test.tsx`
- [X] T025 Run workspace verification for changes touching `src/data/node-definitions.ts`, `src/components/CanvasWorkspace.tsx`, and `src/data/nodeFieldCatalog.ts` with `bun run typecheck`, `bun run lint`, `bun run test:run`, and `bun run test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user story work.
- **User Story 1 (Phase 3)**: Depends on Foundational. Delivers MVP authoring path.
- **User Story 2 (Phase 4)**: Depends on Foundational. Can run in parallel with User Story 1 after shared plumbing lands.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from User Story 1 because auto-wiring targets `enteredAttacked`.
- **User Story 4 (Phase 6)**: Depends on Foundational. Can run in parallel with User Story 2 once shared compile plumbing is in place.
- **Polish (Phase 7)**: Depends on all desired user stories completing.

### User Story Dependencies

- **US1**: No dependency on other user stories.
- **US2**: No dependency on other user stories.
- **US3**: Depends on US1 node type availability for `enteredAttacked` auto-wiring.
- **US4**: No dependency on other user stories.

### Within Each User Story

- Shared tests must be written first and fail before foundational implementation.
- Story tests must be written first and fail before story implementation.
- Metadata and schema changes land before UI behavior changes.
- UI behavior changes land before compiler and restore cleanup that depends on new metadata.
- Story must pass its independent test before moving on.

## Parallel Opportunities

- `T001` and `T002` can run in parallel.
- `T004` and `T005` can run in parallel after `T003` begins.
- `T006` and `T007` can run in parallel for US1.
- `T014` and `T015` can run in parallel for US3.
- `T019` and `T020` can run in parallel for US4.
- US2 and US4 can proceed in parallel after Foundational phase completes.

## Parallel Example: User Story 1

```bash
# Launch US1 test updates together
Task: "Add `enteredAttacked` catalog and socket coverage in src/__tests__/nodeDefinitions.test.ts and src/__tests__/socketTypes.test.ts"
Task: "Add toolbox visibility coverage for Entered / Attacked and hidden legacy triggers in src/__tests__/Sidebar.test.tsx"

# Launch independent US1 implementation work after failing tests exist
Task: "Implement enteredAttacked node metadata and legacy trigger deprecation details in src/data/node-definitions.ts"
Task: "Register enteredAttacked icon/render support in src/nodes/createNode.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch US2 verification first
Task: "Add legacy restore coverage for aggression and proximity graphs in src/__tests__/restoreSavedFlow.test.ts and src/__tests__/canvasFlow.test.tsx"

# Then execute compatibility work
Task: "Preserve legacy trigger hydration and remediation behavior in src/data/node-definitions.ts and src/components/restoreSavedFlow.ts"
Task: "Refresh persisted/default flow expectations for legacy trigger compatibility in src/data/kitchenSinkFlow.ts and src/__tests__/graphYaml.test.ts"
```

## Parallel Example: User Story 3

```bash
# Launch US3 test work together
Task: "Add auto-wiring and removed-port regression tests covering both compatible inputs, duplicate suppression, and pre-connected-input protection in src/__tests__/canvasFlow.test.tsx and src/__tests__/compiler/irBuilder.test.ts"
Task: "Add queue terminology plus Playwright and axe-core workflow coverage for toolbox/drop auto-wiring in src/__tests__/nodeDefinitions.test.ts, src/__tests__/Sidebar.test.tsx, and tests/e2e/canvas-workflow.spec.ts"

# Then split implementation by concern
Task: "Rename queue-facing Priority copy and remove priority_out from addToQueue in src/data/node-definitions.ts"
Task: "Implement deterministic Add to Queue auto-wiring on drop in src/components/CanvasWorkspace.tsx"
```

## Parallel Example: User Story 4

```bash
# Launch US4 tests together
Task: "Add zero-weight normalization unit coverage in src/__tests__/nodeFieldCatalog.test.ts and src/__tests__/compiler/generators/actions.test.ts"
Task: "Add restore and canvas regression coverage for zero queue weights in src/__tests__/restoreSavedFlow.test.ts and src/__tests__/canvasFlow.test.tsx"

# Then finish normalization path
Task: "Normalize addToQueue zero weights in src/data/nodeFieldCatalog.ts and src/data/node-definitions.ts"
Task: "Thread normalized queue weights through restore, IR build, and action emission in src/components/restoreSavedFlow.ts, src/compiler/irBuilder.ts, and src/compiler/generators/actions.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3.
3. Validate fresh authoring with `Entered / Attacked` in toolbox and canvas.
4. Stop and demo MVP before deeper compatibility and queue refinements.

### Incremental Delivery

1. Finish shared setup and foundational catalog/compiler plumbing.
2. Deliver US1 for new authoring path.
3. Deliver US2 for backward-compatible restore.
4. Deliver US3 for queue QoL and auto-wiring.
5. Deliver US4 for zero-weight normalization.
6. Run final verification and polish.

### Parallel Team Strategy

1. One developer handles shared catalog/compiler plumbing in Phases 1-2.
2. After Phase 2, split work by story:
   - Developer A: US1 current trigger path
   - Developer B: US2 legacy restore
   - Developer C: US4 normalization
3. Merge US3 after US1 metadata lands because auto-wiring depends on `enteredAttacked`.

## Notes

- `[P]` means different files and no incomplete dependency required.
- Every task includes exact file paths for direct execution.
- Tests are first-class work for every story because feature spec requires automated coverage and green local verification.
- Suggested MVP scope: **Phase 3 / User Story 1 only**.
- Format validation: all tasks use checkbox + task id + optional `[P]` + optional story label + exact file paths.
