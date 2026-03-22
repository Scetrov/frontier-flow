# Tasks: WASM Contract Compilation Pipeline

**Input**: Design documents from `/specs/006-wasm-compile-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/compilation-pipeline.md, quickstart.md

`__tests__`: Included — FR-028 through FR-033 explicitly require unit tests for generators, validation, error parsing, and idle timer behaviour. Test-first approach per Constitution principle VI.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Tests: `src/__tests__/` (Vitest + @testing-library/react)
- E2E: `tests/e2e/` (Playwright)
- Fixtures: `src/__fixtures__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create directory structure, and define all shared types

- [x] T001 Install `@zktx.io/sui-move-builder` with `--exact` pin per SECURITY.md (`bun add @zktx.io/sui-move-builder --exact`)
- [x] T002 [P] Create all compiler types — IR types (IRNode, IRConnection, IRGraph), pipeline output types (EmitterOutput, SourceMapEntry, AnnotatedLine), validation types (ValidationResult, CompilerDiagnostic), CompilationStatus discriminated union, NodeCodeGenerator interface, GenerationContext, and OptimizationReport — in `src/compiler/types.ts`
- [x] T003 [P] Create test fixture directory structure and graph fixture JSON files (default-graph, empty-graph, disconnected-graph, cyclic-graph, large-graph, minimal-graph) in `src/__fixtures__/graphs/` and WASM mock fixtures (bytecode-fixture.ts, error-fixtures.ts) in `src/__fixtures__/compiler/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core IR builder and generator registry that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement IR builder transforming React Flow nodes and edges into IRGraph with topological sort for execution order in `src/compiler/irBuilder.ts`
- [x] T005 [P] Create NodeCodeGenerator strategy interface, GenerationContext factory, and generator registry scaffold (Map&lt;string, NodeCodeGenerator&gt;) in `src/compiler/generators/index.ts`
- [x] T006 [P] Write unit tests for IR builder covering single-node, multi-node, edge mapping, topological sort, and module name sanitisation in `src/__tests__/compiler/irBuilder.test.ts`

**Checkpoint**: IR builder and generator registry ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Node-to-Code Generation (Priority: P1) 🎯 MVP

**Goal**: Transform the internal graph representation into valid, deterministic Sui Move source code through IR construction, sanitisation, optimisation, and emission with source map traceability.

**Independent Test**: Construct graphs programmatically, run through the code generation pipeline (IR → sanitise → optimise → emit), and assert emitted Move source matches expected snapshots at both individual-node and full-contract level.

### Tests for User Story 1

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T007 [P] [US1] Write unit tests for event-trigger generators (aggression, proximity) covering function signature and entry-point boilerplate emission in `src/__tests__/compiler/generators/eventTriggers.test.ts`
- [x] T008 [P] [US1] Write unit tests for data-accessor generators (getTribe, hpRatio, shieldRatio, armorRatio, getGroupId, getBehaviour, isAggressor, getPriorityWeight) covering per-accessor code fragment output in `src/__tests__/compiler/generators/dataAccessors.test.ts`
- [x] T009 [P] [US1] Write unit tests for scoring-modifier generators (behaviourBonus, aggressorBonus, damageBonus, sizeTierBonus, groupBonusLookup, threatBonus, historyPenalty) covering modifier computation emission in `src/__tests__/compiler/generators/scoringModifiers.test.ts`
- [x] T010 [P] [US1] Write unit tests for logic-gate generators (excludeOwner, excludeSameTribe, excludeStoppedAttack, excludeNpc, isInList, countAggressors) covering boolean filter emission in `src/__tests__/compiler/generators/logicGates.test.ts`
- [x] T011 [P] [US1] Write unit tests for data-source generators (groupBonusConfig, roundRobinConfig, threatLedgerConfig, typeBlocklistConfig, getTribeListFromConfig, getItemListFromConfig, getCharacterListFromConfig) covering config struct emission in `src/__tests__/compiler/generators/dataSources.test.ts`
- [x] T012 [P] [US1] Write unit tests for action generator (addToQueue) covering queue operation emission in `src/__tests__/compiler/generators/actions.test.ts`
- [x] T013 [P] [US1] Write unit tests for input sanitiser covering allowlist validation, special character stripping, Move identifier safety, and injection prevention in `src/__tests__/compiler/sanitiser.test.ts`
- [x] T014 [P] [US1] Write unit tests for IR optimiser covering dead branch elimination, vector folding, constant propagation, and gas estimation in `src/__tests__/compiler/optimiser.test.ts`
- [x] T015 [P] [US1] Write unit tests for code emitter covering Move source emission, source map entry creation, indentation, import accumulation, and deterministic output in `src/__tests__/compiler/emitter.test.ts`

### Implementation for User Story 1

- [x] T016 [P] [US1] Implement event-trigger generators (aggression, proximity) with validate() and emit() per NodeCodeGenerator interface in `src/compiler/generators/eventTriggers.ts`
- [x] T017 [P] [US1] Implement data-accessor generators (getTribe, hpRatio, shieldRatio, armorRatio, getGroupId, getBehaviour, isAggressor, getPriorityWeight) in `src/compiler/generators/dataAccessors.ts`
- [x] T018 [P] [US1] Implement scoring-modifier generators (behaviourBonus, aggressorBonus, damageBonus, sizeTierBonus, groupBonusLookup, threatBonus, historyPenalty) in `src/compiler/generators/scoringModifiers.ts`
- [x] T019 [P] [US1] Implement logic-gate generators (excludeOwner, excludeSameTribe, excludeStoppedAttack, excludeNpc, isInList, countAggressors) in `src/compiler/generators/logicGates.ts`
- [x] T020 [P] [US1] Implement data-source generators (groupBonusConfig, roundRobinConfig, threatLedgerConfig, typeBlocklistConfig, getTribeListFromConfig, getItemListFromConfig, getCharacterListFromConfig) in `src/compiler/generators/dataSources.ts`
- [x] T021 [P] [US1] Implement action generator (addToQueue) in `src/compiler/generators/actions.ts`
- [x] T022 [US1] Implement input sanitiser with strict allowlist for Move identifiers and injection prevention in `src/compiler/sanitiser.ts`
- [x] T023 [US1] Implement IR optimiser (dead branch elimination, vector folding, constant propagation, gas reorder) with OptimizationReport output in `src/compiler/optimiser.ts`
- [x] T024 [US1] Implement code emitter with source map generation, import assembly, module structure, and Move.toml template in `src/compiler/emitter.ts`
- [x] T025 [US1] Create expected Move output golden snapshot files (default-turret.move, single-proximity.move, full-graph.move) in `src/__fixtures__/move/`
- [x] T026 [US1] Write snapshot integration tests constructing complete graphs and verifying emitted Move modules match golden files in `src/__tests__/compiler/pipeline.test.ts`

**Checkpoint**: Code generation pipeline produces valid, deterministic Move source from canvas graphs. Each node type has tested code output. Sanitisation prevents injection.

---

## Phase 4: User Story 2 — Graph Validation with Error and Warning Surfacing (Priority: P1)

**Goal**: Validate the graph for structural completeness and type safety before code generation. Surface validation diagnostics visually on affected canvas nodes.

**Independent Test**: Construct graphs with known validation issues (unconnected inputs, disconnected nodes, type mismatches, cycles, missing entry points) and assert the validator returns correct diagnostics with node references.

### Tests for User Story 2

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T027 [US2] Write unit tests for graph validator covering unconnected required inputs, disconnected nodes, missing event-trigger entry point, type mismatches across socket compatibility matrix, and cyclic dependency detection in `src/__tests__/compiler/validator.test.ts`

### Implementation for User Story 2

- [x] T028 [US2] Implement graph validator — structural completeness check (all required input sockets connected), type safety check (socket compatibility matrix), DAG verification (cycle detection via topological sort), disconnected node detection, and entry-point requirement — in `src/compiler/validator.ts`
- [x] T029 [US2] Add validation error/warning visual indicators to canvas nodes — data-validation-error and data-validation-warning attributes propagated via CanvasWorkspace, red/orange border CSS classes on affected nodes

**Checkpoint**: Validator catches all structural and type-safety issues. Affected nodes are visually highlighted on the canvas.

---

## Phase 5: User Story 3 — In-Browser WASM Compilation with Auto-Compile on Idle (Priority: P1)

**Goal**: Compile generated Move source via `@zktx.io/sui-move-builder/lite` WASM entirely in-browser. Auto-trigger compilation after a configurable idle period with cancellation on new edits.

**Independent Test**: Simulate graph edits with fake timers, verify idle timeout triggers compilation pipeline, confirm WASM mock is called with correct files, and assert result updates compilation status. Test cancellation by simulating edits during compilation.

### Tests for User Story 3

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T030 [P] [US3] Write unit tests for useAutoCompile hook covering debounce timer reset on edit, cancellation of in-flight compilation, correct trigger after idle period, lazy WASM init on first compile, and skip-on-validation-error in `src/__tests__/hooks/useAutoCompile.test.ts`

### Implementation for User Story 3

- [x] T031 [US3] Implement WASM compiler wrapper with lazy loading of `@zktx.io/sui-move-builder/lite`, Move.toml assembly, and error-safe compile interface (never throws — returns CompileResult) in `src/compiler/moveCompiler.ts`
- [x] T032 [US3] Implement pipeline orchestrator chaining all phases (IR build → validate → sanitise → optimise → emit → WASM compile) with AbortSignal support and early return on validation errors in `src/compiler/pipeline.ts`
- [x] T033 [US3] Implement useAutoCompile React hook with debounced idle timer (default 2500ms), AbortController cancellation, compilation state machine, and triggerCompile() for manual builds in `src/hooks/useAutoCompile.ts`
- [x] T034 [US3] Integrate useAutoCompile hook into CanvasWorkspace/App — pass nodes, edges, moduleName to hook and propagate CompilationState (status, diagnostics, triggerCompile) to Header and Footer via props

**Checkpoint**: Graphs auto-compile after idle, WASM runs in-browser, in-flight compilations cancel on new edits.

---

## Phase 6: User Story 4 — Footer Compilation Status Indicator (Priority: P1)

**Goal**: Display a persistent status indicator in the footer with four colour-coded states: Idle (blue), Compiling (orange), Compiled (green), Error (red). Real-time updates with ARIA live region for accessibility.

**Independent Test**: Render the CompilationStatus component in each of the four states and assert correct colour, label, ARIA attributes, and error detail accessibility.

### Tests for User Story 4

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T035 [US4] Write unit tests for CompilationStatus component covering all four states (idle/compiling/compiled/error), colour dot rendering, label text, ARIA live region announcements, and error detail expansion in `src/__tests__/CompilationStatus.test.ts`

### Implementation for User Story 4

- [x] T036 [US4] Implement CompilationStatus component — coloured dot (8px, 0px border-radius), text label, `aria-live="polite"` region, and click-to-expand error details — in `src/components/CompilationStatus.tsx`
- [x] T037 [US4] Integrate CompilationStatus into Footer — render in the status bar area, receive status and diagnostics props from parent compilation state — in `src/components/Footer.tsx`
- [x] T038 [US4] Add CSS variables for status indicator colours (`--status-idle: #3b82f6`, `--status-compiled: #22c55e`, `--status-error: #ef4444`, reuse `--brand-orange` for compiling) in `src/index.css`

**Checkpoint**: Footer shows real-time compilation status with four colour-coded states and accessible announcements.

---

## Phase 7: User Story 5 — Manual Build Button in Header (Priority: P2)

**Goal**: Add a "Build" button to the header that manually triggers the compilation pipeline. Button is disabled during active compilation.

**Independent Test**: Simulate button click and assert compilation pipeline fires, status transitions correctly, and button is disabled during compilation.

### Tests for User Story 5

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T039 [US5] Write unit tests for Build button covering click triggers compilation, disabled state during compilation, empty graph validation error, and no duplicate compilation when auto-compile is in progress in `src/__tests__/Header.test.ts`

### Implementation for User Story 5

- [x] T040 [US5] Add Build button to Header right section (next to WalletStatus) with disabled state (`aria-disabled`, muted styling), click handler wired to triggerCompile() callback, and 0px border-radius in `src/components/Header.tsx`

**Checkpoint**: Build button manually triggers the same compilation pipeline as auto-compile.

---

## Phase 8: User Story 6 — Compiler Error Traceability to Canvas Nodes (Priority: P2)

**Goal**: Parse raw Move compiler error output into structured diagnostics, map each error back to the originating canvas node via the source map, and surface errors in the UI with click-to-highlight.

**Independent Test**: Feed known Move compiler error outputs and source maps to the parser and assert correct node mappings. Verify unmappable lines still produce diagnostics with "unknown node" attribution.

### Tests for User Story 6

> [!NOTE]
> Write these tests FIRST, ensure they FAIL before implementation

- [x] T041 [US6] Write unit tests for compiler error parser covering single error, multiple errors, warnings, unmappable lines (no source map entry), and malformed compiler output in `src/__tests__/compiler/errorParser.test.ts`

### Implementation for User Story 6

- [x] T042 [US6] Implement compiler error parser — regex-based extraction of severity, message, and source line from raw Move compiler output — in `src/compiler/errorParser.ts`
- [x] T043 [US6] Implement source-map-based error-to-node mapping — look up SourceMapEntry by line number and attach reactFlowNodeId to each CompilerDiagnostic — in `src/compiler/errorParser.ts`
- [x] T044 [US6] Surface compiler diagnostics on canvas — propagate diagnostics to CanvasWorkspace, highlight affected nodes with data attributes, and enable click-on-error-to-pan-to-node in `src/components/CanvasWorkspace.tsx`

**Checkpoint**: Compiler errors are parsed, traced to originating canvas nodes, and surfaced as clickable references.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, integration test updates, and final validation across all stories

- [x] T045 [P] Write Playwright E2E test for auto-compile workflow — edit graph, wait for idle, verify status transitions (Idle → Compiling → Compiled), and verify Build button interaction in `tests/e2e/compilation.spec.ts`
- [x] T046 [P] Write Playwright E2E test for error surfacing — create disconnected node, verify Error status and node-level highlighting, fix graph, verify Compiled status in `tests/e2e/error-surfacing.spec.ts`
- [x] T047 Update existing Footer tests with compilation status integration assertions in `src/__tests__/Footer.test.ts`
- [x] T048 Verify and update Vite configuration for WASM module compatibility (optimizeDeps.exclude if needed) in `vite.config.ts`
- [x] T049 Run quickstart.md manual validation checklist to verify end-to-end workflow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — code generation is the foundational transformation
- **US2 (Phase 4)**: Depends on Phase 2 — validator uses IR types and graph structure
- **US3 (Phase 5)**: Depends on US1 (code gen) and US2 (validation gate)
- **US4 (Phase 6)**: Depends on US3 (compilation status state machine)
- **US5 (Phase 7)**: Depends on US3 (triggerCompile), US4 (status indicator)
- **US6 (Phase 8)**: Depends on US1 (source map) and US3 (WASM errors)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Independence

- **US1 (P1)**: Can start after Phase 2 — no dependency on other stories
- **US2 (P1)**: Can start after Phase 2 — independent of US1, can run in parallel
- **US3 (P1)**: Requires US1 + US2 — integrates code gen and validation into full pipeline
- **US4 (P1)**: Requires US3 — renders compilation state from the hook
- **US5 (P2)**: Requires US3 — uses triggerCompile() from auto-compile hook
- **US6 (P2)**: Requires US3 — uses source map and raw compiler error output

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types and interfaces before implementations
- Core pipeline phases before integration points
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1**: T002, T003 can run in parallel (different directories)
**Phase 2**: T005, T006 can run in parallel (different files)
**Phase 3 Tests**: T007–T015 can ALL run in parallel (nine independent test files)
**Phase 3 Implementation**: T016–T021 can ALL run in parallel (six independent generator files)
**Phase 3+4**: US1 and US2 can proceed in parallel after Phase 2
**Phase 9**: T045, T046 can run in parallel (independent E2E specs)

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (9 files, all independent):
T007: eventTriggers.test.ts    T008: dataAccessors.test.ts
T009: scoringModifiers.test.ts T010: logicGates.test.ts
T011: dataSources.test.ts      T012: actions.test.ts
T013: sanitiser.test.ts        T014: optimiser.test.ts
T015: emitter.test.ts

# Launch all generators together (6 files, all independent):
T016: eventTriggers.ts         T017: dataAccessors.ts
T018: scoringModifiers.ts      T019: logicGates.ts
T020: dataSources.ts           T021: actions.ts

# Then sequential (file dependencies):
T022: sanitiser.ts → T023: optimiser.ts → T024: emitter.ts
T025: Move snapshots → T026: integration tests
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — code generation pipeline
4. **STOP and VALIDATE**: Run `bun run test:run -- src/__tests__/compiler/` — all generator and pipeline tests pass
5. Verify deterministic output: same graph → byte-for-byte identical Move source

### Incremental Delivery

1. Setup + Foundational → IR builder and types ready
2. US1 → Code generation pipeline produces valid Move source (MVP!)
3. US2 → Validation catches user errors before code gen
4. US3 → Full in-browser compilation with auto-compile on idle
5. US4 → Users see compilation status at a glance
6. US5 → Users can manually trigger builds
7. US6 → Compiler errors trace back to canvas nodes
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (code gen — largest story)
   - Developer B: User Story 2 (validation — independent of US1)
3. After US1 + US2 merge:
   - Developer A: User Story 3 (WASM + auto-compile)
   - Developer B: User Story 6 (error parser — only needs source map types)
4. After US3:
   - US4 + US5 can proceed in parallel

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after its dependencies
- Tests MUST fail before implementation per Constitution principle VI
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- WASM mock required in all unit tests (FR-033) — real WASM only in E2E tests
- All UI components use 0px border-radius per design system
- Generated Move code must be deterministic (FR-010) — snapshot tests enforce this
