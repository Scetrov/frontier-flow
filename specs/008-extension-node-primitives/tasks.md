# Tasks: Extension Node Primitive Refactor

**Input**: Design documents from `/specs/008-extension-node-primitives/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included because the project constitution requires test-first delivery for new features and UX changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared fixtures and verification scaffolding used across stories

- [X] T001 Create legacy and seeded graph fixture scaffolds in `src/__fixtures__/graphs/smartTurretExtensionFixtures.ts`
- [X] T002 [P] Extend end-to-end reference fixture coverage for seeded and migrated flows in `tests/e2e/referenceGraphFixtures.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core typed infrastructure that must exist before story work can be implemented safely

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Extend editable field and deprecation contracts in `src/types/nodes.ts`
- [X] T004 [P] Introduce typed migration registry and remediation models in `src/data/nodeMigration.ts`
- [X] T005 [P] Extend seeded contract entry and storage version models in `src/utils/contractStorage.ts`
- [X] T006 Preserve editable field data during node hydration in `src/data/node-definitions.ts`
- [X] T007 Apply migration rules and remediation notices during restore in `src/components/restoreSavedFlow.ts`

**Checkpoint**: Typed node persistence, migration, and restore infrastructure are ready for story implementation.

---

## Phase 3: User Story 1 - Compose target logic from primitive nodes (Priority: P1) 🎯 MVP

**Goal**: Replace awkward bundled logic with direct predicates and boolean operator nodes.

**Independent Test**: Build a rule equivalent to `exclude same tribe unless aggressor` using primitive nodes and confirm no hidden config-object behavior is required.

### Tests for User Story 1 ⚠️

Note: Write these tests first and confirm they fail before implementation.

- [ ] T008 [P] [US1] Add primitive predicate and operator definition coverage in `src/__tests__/nodeDefinitions.test.ts`
- [ ] T009 [P] [US1] Add legacy bundled-node migration regression tests in `src/__tests__/restoreSavedFlow.test.ts`
- [ ] T010 [P] [US1] Add boolean operator generator tests in `src/__tests__/compiler/booleanOperators.test.ts`
- [ ] T011 [P] [US1] Add Playwright coverage for primitive targeting composition and migrated legacy remediation in `tests/e2e/canvas.spec.ts`
  Acceptance criteria: Compose a rule equivalent to `exclude same tribe unless aggressor` using only primitive predicate and boolean operator nodes, save or reload the flow, and verify the graph remains intact without any retired config-object UI.
  Acceptance criteria: Load a legacy bundled-node graph fixture, verify exact mappings auto-migrate to the new primitives, and verify any non-exact mapping surfaces a visible remediation notice instead of silently dropping behavior.

### Implementation for User Story 1

- [ ] T012 [US1] Add primitive predicate and boolean operator node definitions in `src/data/node-definitions.ts`
- [ ] T013 [P] [US1] Register primitive node icons and metadata lookups in `src/nodes/createNode.tsx`
- [ ] T014 [P] [US1] Register primitive flow node types in `src/nodes/index.ts`
- [ ] T015 [US1] Update shared primitive node rendering and deprecated-node affordances in `src/nodes/BaseNode.tsx`
- [ ] T016 [US1] Implement boolean operator and direct predicate emitters in `src/compiler/generators/logicGates.ts`
- [ ] T017 [US1] Wire new primitive generator coverage in `src/compiler/generators/index.ts`
- [ ] T018 [US1] Implement exact migration mappings for retired config and composite nodes in `src/data/nodeMigration.ts`

**Checkpoint**: User Story 1 is independently functional when primitive nodes can recreate the target rule and migrated legacy nodes preserve exact semantics.

---

## Phase 4: User Story 2 - Edit list-based node values directly (Priority: P2)

**Goal**: Allow builders to add, edit, validate, and persist list-valued node inputs such as tribes and type IDs.

**Independent Test**: Open a list-backed node, add multiple values, correct an invalid entry, save, reopen, and confirm the final valid list is still present.

### Tests for User Story 2 ⚠️

Note: Write these tests first and confirm they fail before implementation.

- [ ] T019 [P] [US2] Add list field editor interaction tests in `src/__tests__/NodeFieldEditor.test.tsx`
- [ ] T020 [P] [US2] Add editable field persistence tests in `src/__tests__/nodeFieldPersistence.test.ts`
- [ ] T021 [P] [US2] Add canvas editing flow tests for node field save and reopen behavior in `src/__tests__/canvasFlow.test.tsx`
- [ ] T022 [P] [US2] Add Playwright coverage for list-field editing, validation, and reopen persistence in `tests/e2e/canvas.spec.ts`
  Acceptance criteria: Open a list-backed node, add multiple values, trigger validation on an invalid entry, correct the invalid value, save, reload, and verify only the final valid list persists.
  Acceptance criteria: Confirm keyboard-accessible edit and save interactions remain operable in the browser flow and that validation feedback is visible before submission succeeds.

### Implementation for User Story 2

- [ ] T023 [US2] Add editable field schemas and list-backed defaults to node definitions in `src/data/node-definitions.ts`
- [ ] T024 [P] [US2] Implement reusable typed node field editor UI in `src/components/NodeFieldEditor.tsx`
- [ ] T025 [P] [US2] Add list editor styling and focus/error states in `src/index.css`
- [ ] T026 [US2] Add node-level edit triggers and field summaries in `src/nodes/BaseNode.tsx`
- [ ] T027 [US2] Integrate field editor state, validation, and save handling in `src/components/CanvasWorkspace.tsx`
- [ ] T028 [US2] Persist editable field values through storage serialization in `src/utils/contractStorage.ts`
- [ ] T029 [US2] Preserve editable field values during restore and hydration in `src/components/restoreSavedFlow.ts`

**Checkpoint**: User Story 2 is independently functional when list-valued node data can be edited, validated, saved, restored, and reopened without data loss.

---

## Phase 5: User Story 3 - Start from pre-populated example contracts (Priority: P3)

**Goal**: Seed the Load panel with curated example contracts while protecting existing user work.

**Independent Test**: Open the Load panel in a clean workspace, verify seeded examples are listed, load one, and confirm the app asks before replacing unsaved canvas work.

### Tests for User Story 3 ⚠️

Note: Write these tests first and confirm they fail before implementation.

- [ ] T030 [P] [US3] Add seeded contract library merge and deduplication tests in `src/__tests__/contractLibrarySeed.test.ts`
- [ ] T031 [P] [US3] Add Playwright coverage for seeded Load panel entries and replacement confirmation in `tests/e2e/load-panel.spec.ts`

### Implementation for User Story 3

- [ ] T032 [P] [US3] Define curated seeded example contracts in `src/data/exampleContracts.ts`
- [ ] T033 [US3] Merge seeded example contracts into the contract library load path in `src/utils/contractStorage.ts`
- [ ] T034 [US3] Update Load panel seeded-entry presentation and destructive-load confirmation in `src/components/CanvasWorkspace.tsx`
- [ ] T035 [US3] Align starter canvas behavior with the seeded example catalogue in `src/data/kitchenSinkFlow.ts`
- [ ] T036 [US3] Extend seeded example end-to-end fixtures in `tests/e2e/referenceGraphFixtures.ts`

**Checkpoint**: User Story 3 is independently functional when curated examples appear in the Load panel, load correctly, and do not overwrite unsaved work without confirmation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Tighten regression coverage, UX copy, and final verification across all stories

- [ ] T037 [P] Add final regression fixtures for migrated legacy graphs and seeded examples in `src/__fixtures__/graphs/smartTurretExtensionFixtures.ts`
- [ ] T038 [P] Add accessibility and remediation copy polish for field editing and Load panel states in `src/index.css`
- [ ] T039 Run quickstart validation and capture final verification notes in `specs/008-extension-node-primitives/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup; blocks all user story implementation
- **User Story Phases (Phase 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational; no dependency on other user stories
- **User Story 2 (P2)**: Starts after Foundational; uses shared field and restore infrastructure but remains independently testable
- **User Story 3 (P3)**: Starts after Foundational; uses shared contract storage infrastructure but remains independently testable

### Within Each User Story

- Tests must be written and observed failing before implementation tasks begin
- Schema and model changes precede UI integration
- Restore and persistence work follows schema changes
- Story verification must complete before the story is considered done

### Parallel Opportunities

- `T002`, `T004`, and `T005` can run in parallel after setup begins
- All test tasks within a user story marked `[P]` can run in parallel
- `T013` and `T014` can run in parallel once `T012` is defined
- `T024` and `T025` can run in parallel once `T023` defines the field schema
- `T030` and `T031` can run in parallel before User Story 3 implementation
- `T037` and `T038` can run in parallel during polish

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1 tests together:
Task: "Add primitive predicate and operator definition coverage in src/__tests__/nodeDefinitions.test.ts"
Task: "Add legacy bundled-node migration regression tests in src/__tests__/restoreSavedFlow.test.ts"
Task: "Add boolean operator generator tests in src/__tests__/compiler/booleanOperators.test.ts"
Task: "Add Playwright coverage for primitive targeting composition and migrated legacy remediation in tests/e2e/canvas.spec.ts"

# Launch independent registry wiring tasks together:
Task: "Register primitive node icons and metadata lookups in src/nodes/createNode.tsx"
Task: "Register primitive flow node types in src/nodes/index.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch User Story 2 tests together:
Task: "Add list field editor interaction tests in src/__tests__/NodeFieldEditor.test.tsx"
Task: "Add editable field persistence tests in src/__tests__/nodeFieldPersistence.test.ts"
Task: "Add canvas editing flow tests for node field save and reopen behavior in src/__tests__/canvasFlow.test.tsx"
Task: "Add Playwright coverage for list-field editing, validation, and reopen persistence in tests/e2e/canvas.spec.ts"

# Launch independent UI implementation tasks together:
Task: "Implement reusable typed node field editor UI in src/components/NodeFieldEditor.tsx"
Task: "Add list editor styling and focus/error states in src/index.css"
```

---

## Parallel Example: User Story 3

```bash
# Launch User Story 3 verification together:
Task: "Add seeded contract library merge and deduplication tests in src/__tests__/contractLibrarySeed.test.ts"
Task: "Add Playwright coverage for seeded Load panel entries and replacement confirmation in tests/e2e/load-panel.spec.ts"

# Launch independent seeded-example authoring tasks together:
Task: "Define curated seeded example contracts in src/data/exampleContracts.ts"
Task: "Extend seeded example end-to-end fixtures in tests/e2e/referenceGraphFixtures.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the primitive-node workflow plus legacy exact-migration path
5. Demo or ship the MVP once User Story 1 is stable

### Incremental Delivery

1. Finish Setup + Foundational so typed persistence and migration are stable
2. Deliver User Story 1 and validate primitive logic composition
3. Deliver User Story 2 and validate editable list-backed nodes
4. Deliver User Story 3 and validate seeded examples plus load confirmation
5. Finish with polish and quickstart verification

### Parallel Team Strategy

1. One developer completes foundational type/storage/restore work
2. After Phase 2:
   - Developer A: User Story 1 primitive nodes and migration mapping
   - Developer B: User Story 2 field editor and persistence UX
   - Developer C: User Story 3 seeded example contract library and Load panel updates
3. Rejoin for polish, quickstart validation, and final regression review

---

## Notes

- `[P]` tasks touch different files and have no dependency on incomplete parallel work
- `[US1]`, `[US2]`, and `[US3]` map directly to spec user stories
- Each story is independently testable at its checkpoint before moving on
- Prefer small commits per task or tightly related task group
- Do not silently drop legacy nodes or field values during implementation
