# 1. Tasks: Graph Import, Export, and Publish

**Input**: Design documents from `/specs/015-graph-io-publish/`
**Prerequisites**: `plan.md` and `spec.md`; optional inputs used: `research.md`, `data-model.md`, `contracts/interfaces.md`, `quickstart.md`

## 1.1. Phase 1: Setup

**Purpose**: Install the transfer dependencies and establish the Walrus browser configuration surface.

- [X] T001 Add `@mysten/walrus` and `yaml` runtime dependencies in `package.json` and `bun.lock`
- [X] T002 [P] Create browser Walrus target configuration in `src/utils/walrusGraphConfig.ts`
- [X] T003 [P] Add Walrus WASM and env typing support in `src/vite-env.d.ts`

---

## 1.2. Phase 2: Foundational

**Purpose**: Build the shared graph-transfer model and storage hooks that block all user stories.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [X] T004 [P] Add failing provenance and backward-compatible parsing tests in `src/__tests__/contractLibrarySeed.test.ts`
- [X] T005 [P] Add failing portable graph validation tests in `src/__tests__/graphDocument.test.ts`
- [X] T006 [P] Add failing transfer controller state-machine tests in `src/__tests__/useGraphTransfer.test.ts`
- [X] T007 [P] Extend saved-contract provenance and backward-compatible parsing in `src/utils/contractStorage.ts`
- [X] T008 [P] Implement the versioned portable graph types and validation helpers in `src/utils/graphDocument.ts`
- [X] T009 Create the shared transfer controller state machine in `src/hooks/useGraphTransfer.ts`

**Checkpoint**: The contract library, portable document model, and transfer state orchestration are ready for story work.

---

## 1.3. Phase 3: User Story 1 - Move Graphs In and Out of Frontier Flow (Priority: P1) 🎯 MVP

**Goal**: Let users export the active graph to YAML and import a YAML graph back into the local contract library.

**Independent Test**: Export a saved contract to YAML, clear or switch the active contract, import the YAML file, and confirm the graph reappears with the expected name, nodes, edges, and layout.

### 1.3.1. Tests for User Story 1

- [X] T010 [P] [US1] Add portable-document round-trip tests in `src/__tests__/graphDocument.test.ts`
- [X] T011 [P] [US1] Add YAML serialization and parse-failure tests in `src/__tests__/graphYaml.test.ts`
- [X] T012 [P] [US1] Add drawer import/export interaction coverage in `src/__tests__/canvasFlow.test.tsx`

### 1.3.2. Implementation for User Story 1

- [X] T013 [US1] Implement deterministic YAML serialization and file-name generation in `src/utils/graphYaml.ts`
- [X] T014 [US1] Implement local file import and export flows in `src/hooks/useGraphTransfer.ts`
- [X] T015 [US1] Build the YAML import/export dialog UI in `src/components/GraphTransferDialog.tsx`
- [X] T016 [US1] Wire Import and Export actions into the saved-contract drawer in `src/components/CanvasWorkspace.tsx`
- [X] T017 [US1] Merge imported contracts with conflict-safe naming in `src/utils/contractStorage.ts`

**Checkpoint**: User Story 1 is fully functional when YAML import and export complete without overwriting existing contracts.

---

## 1.4. Phase 4: User Story 2 - Publish Graphs to Walrus and Reopen Them Later (Priority: P1)

**Goal**: Let users publish the active graph to Walrus, capture a reusable reference, and import a graph from Walrus back into the contract library.

**Independent Test**: Publish a saved contract to Walrus, capture the returned reference, import from that reference, and confirm the graph restores locally without changing the current graph on failure.

### 1.4.1. Tests for User Story 2

- [X] T018 [P] [US2] Add Walrus client publish/read unit tests in `src/__tests__/walrusGraphClient.test.ts`
- [X] T019 [P] [US2] Add Walrus transfer dialog and controller tests in `src/__tests__/GraphTransferDialog.test.tsx`

### 1.4.2. Implementation for User Story 2

- [X] T020 [US2] Implement Walrus blob publish/read helpers in `src/utils/walrusGraphClient.ts`
- [X] T021 [US2] Integrate Walrus publish and import flows into `src/hooks/useGraphTransfer.ts`
- [X] T022 [US2] Add Walrus reference entry, progress, and success states in `src/components/GraphTransferDialog.tsx`
- [X] T023 [US2] Surface Publish and Walrus Import actions plus provenance details in `src/components/CanvasWorkspace.tsx` and `src/utils/contractStorage.ts`

**Checkpoint**: User Story 2 is fully functional when Walrus publish returns a reusable reference and Walrus import restores a local contract safely.

---

## 1.5. Phase 5: User Story 3 - Use Transfer Actions From the Existing Save Controls (Priority: P2)

**Goal**: Present import, export, and publish in the existing Save / Save Copy / Delete workflow with accessible, coherent controls.

**Independent Test**: Open the saved-contract drawer and complete Save, Save Copy, Delete, Import, Export, and Publish from one coherent control group without leaving the canvas workspace.

### 1.5.1. Tests for User Story 3

- [X] T024 [P] [US3] Add saved-contract drawer layout and keyboard-accessibility coverage in `src/__tests__/canvasFlow.test.tsx` and `src/__tests__/GraphTransferDialog.test.tsx`

### 1.5.2. Implementation for User Story 3

- [X] T025 [US3] Refactor the saved-contract action groups and labels in `src/components/CanvasWorkspace.tsx`
- [X] T026 [US3] Add focus management, live-region feedback, and inline guidance in `src/components/GraphTransferDialog.tsx`
- [X] T027 [US3] Centralize dismiss, reset, and action availability rules in `src/hooks/useGraphTransfer.ts`

**Checkpoint**: User Story 3 is fully functional when transfer actions are discoverable, keyboard reachable, and visually coherent with the existing drawer controls.

---

## 1.6. Phase 6: User Story 4 - Safely Recover From Invalid or Conflicting Imports (Priority: P2)

**Goal**: Reject malformed or conflicting imports without mutating the active graph or damaging seeded and user-saved contracts.

**Independent Test**: Attempt malformed YAML, unsupported schema versions, dangling-edge payloads, duplicate names, and invalid Walrus references; confirm the active graph remains unchanged and the user sees actionable errors.

### 1.6.1. Tests for User Story 4

- [X] T028 [P] [US4] Add malformed YAML, schema-version, and dangling-edge validation tests in `src/__tests__/graphDocument.test.ts` and `src/__tests__/graphYaml.test.ts`
- [X] T029 [P] [US4] Add failure-state and no-mutation regression coverage in `src/__tests__/canvasFlow.test.tsx` and `src/__tests__/GraphTransferDialog.test.tsx`
- [X] T030 [P] [US4] Add draft contract-name preservation coverage for import start, cancel, and failure in `src/__tests__/canvasFlow.test.tsx` and `src/__tests__/useGraphTransfer.test.ts`

### 1.6.2. Implementation for User Story 4

- [X] T031 [US4] Harden schema-version and graph-consistency validation in `src/utils/graphDocument.ts`
- [X] T032 [US4] Enforce cancel-safe and failure-safe state transitions in `src/hooks/useGraphTransfer.ts`
- [X] T033 [US4] Preserve draft contract-name state during import flows in `src/components/CanvasWorkspace.tsx` and `src/hooks/useGraphTransfer.ts`
- [X] T034 [US4] Prevent seeded-example overwrite and surface conflict messaging in `src/utils/contractStorage.ts` and `src/components/GraphTransferDialog.tsx`

**Checkpoint**: User Story 4 is fully functional when all invalid transfer inputs fail safely and leave the current workspace intact.

---

## 1.7. Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish regression coverage, operator documentation, and end-to-end validation across stories.

- [X] T035 [P] Add end-to-end graph transfer coverage in `tests/e2e/graph-transfer.spec.ts`
- [X] T036 [P] Add `axe-core` accessibility audit coverage for the transfer drawer and dialog in `tests/e2e/graph-transfer.spec.ts`
- [X] T037 [P] Update transfer workflow and manual validation guidance in `specs/015-graph-io-publish/quickstart.md` and `docs/USER-FLOWS.md`
- [ ] T038 Validate YAML import/export and Walrus publish timing targets in `specs/015-graph-io-publish/quickstart.md` and `tests/e2e/graph-transfer.spec.ts`
- [X] T039 Validate transfer-action discoverability and Save/Save Copy/Delete regression behavior in `tests/e2e/graph-transfer.spec.ts` and `src/__tests__/canvasFlow.test.tsx`
- [X] T040 Run final verification against `src/components/CanvasWorkspace.tsx`, `src/hooks/useGraphTransfer.ts`, `src/__tests__/useGraphTransfer.test.ts`, and `tests/e2e/graph-transfer.spec.ts`

---

## 1.8. Dependencies & Execution Order

### 1.8.1. Phase Dependencies

- **Phase 1: Setup** has no dependencies and can start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user story work.
- **Phase 3: US1** depends on Phase 2 and delivers the MVP YAML round-trip.
- **Phase 4: US2** depends on Phase 2 and reuses the portable document pipeline from `src/utils/graphDocument.ts` and `src/hooks/useGraphTransfer.ts`.
- **Phase 5: US3** depends on Phases 3 and 4 so the UI can present all transfer actions in one coherent drawer.
- **Phase 6: US4** depends on Phases 3 and 4 because safety rules must cover both YAML and Walrus paths.
- **Phase 7: Polish** depends on all desired user stories being complete.

### 1.8.2. User Story Dependencies

- **US1 (P1)** can begin once the foundational transfer model is complete.
- **US2 (P1)** can begin after the foundational transfer model is complete, but it is fastest to layer it after the YAML pipeline from US1 is in place.
- **US3 (P2)** depends on the functional transfer actions from US1 and US2.
- **US4 (P2)** depends on the import flows from US1 and US2 so validation and no-mutation guarantees can cover both channels.

### 1.8.3. Within Each User Story

- In Phase 2, write failing foundational tests `T004` through `T006` before implementation tasks `T007` through `T009`.
- Write and run story tests before implementation tasks in the same phase.
- Build shared document and service logic before wiring drawer UI behavior.
- Complete controller logic before polishing dialog copy and accessibility states.
- Finish each story checkpoint before moving to lower-priority polish work.

---

## 1.9. Parallel Opportunities

- `T002` and `T003` can run in parallel after dependency planning is clear.
- `T004`, `T005`, and `T006` can run in parallel once Phase 1 is complete.
- `T010`, `T011`, and `T012` can run in parallel for the YAML story.
- `T018` and `T019` can run in parallel for the Walrus story.
- `T028`, `T029`, and `T030` can run in parallel for failure-path hardening.
- `T035`, `T036`, and `T037` can run in parallel during polish.

### 1.9.1. Parallel Example: User Story 1

```bash
# Run the YAML story tests together:
T010 src/__tests__/graphDocument.test.ts
T011 src/__tests__/graphYaml.test.ts
T012 src/__tests__/canvasFlow.test.tsx

# Then split the implementation work across files:
T013 src/utils/graphYaml.ts
T015 src/components/GraphTransferDialog.tsx
```

### 1.9.2. Parallel Example: User Story 2

```bash
# Start the Walrus story tests together:
T018 src/__tests__/walrusGraphClient.test.ts
T019 src/__tests__/GraphTransferDialog.test.tsx

# Split service and UI work after the tests are in place:
T020 src/utils/walrusGraphClient.ts
T022 src/components/GraphTransferDialog.tsx
```

### 1.9.3. Parallel Example: User Story 4

```bash
# Harden both validation paths at the same time:
T028 src/__tests__/graphDocument.test.ts src/__tests__/graphYaml.test.ts
T029 src/__tests__/canvasFlow.test.tsx src/__tests__/GraphTransferDialog.test.tsx
T030 src/__tests__/canvasFlow.test.tsx src/__tests__/useGraphTransfer.test.ts
```

---

## 1.10. Implementation Strategy

### 1.10.1. MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate YAML round-trip behavior before expanding into Walrus flows.

### 1.10.2. Incremental Delivery

1. Ship YAML import/export first to establish the portable document contract.
2. Add Walrus publish/import on top of the same document pipeline.
3. Consolidate the drawer UX once all transfer actions exist.
4. Finish with safety hardening and end-to-end regression coverage.

### 1.10.3. Parallel Team Strategy

1. One developer handles `src/utils/graphDocument.ts` and `src/utils/contractStorage.ts` in Phase 2.
2. One developer handles dialog and drawer UI in `src/components/GraphTransferDialog.tsx` and `src/components/CanvasWorkspace.tsx` once Phase 2 is ready.
3. One developer handles Walrus integration in `src/utils/walrusGraphClient.ts` and `src/hooks/useGraphTransfer.ts` after the shared document contract stabilizes.

---

## 1.11. Notes

- [P] tasks touch different files and can be implemented in parallel once their dependencies are satisfied.
- User story labels map every implementation task back to `spec.md` for traceability.
- The suggested MVP scope is **User Story 1** because it establishes the portable graph document and immediate user value.
- The strict no-overwrite rule for imports applies to both user-saved and seeded contracts.
