# Tasks: Functional DAG Contracts

**Input**: Design documents from `/specs/010-functional-dag-contracts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Deterministic technical tests are required for this feature. Vitest regression, snapshot approval, semantic compiler tests, and targeted Playwright journeys are included by design.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified as an independent increment once foundational compiler contracts are in place.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared fixture and regression scaffolding for deterministic DAG-to-contract work.

- [ ] T001 Create `smart-turrets`-derived reference DAG fixture scaffolding mapped to `docs/CONTRACT_EXAMPLES.md` in `src/__tests__/compiler/referenceDagFixtures.ts`
- [ ] T002 Create generated artifact assertion helpers in `src/__tests__/compiler/referenceArtifactAssertions.ts`
- [ ] T003 [P] Create authorization readiness browser fixtures in `tests/e2e/fixtures/authorizationReadiness.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the core compiler and workflow contracts that every user story depends on.

**⚠️ CRITICAL**: No user story work should start before this phase is complete.

- [ ] T004 Extend compiler domain contracts for supported DAGs, generated artifacts, traces, readiness, and diagnostics in `src/compiler/types.ts`
- [ ] T005 Create deterministic ordering and identity helpers in `src/compiler/determinism.ts`
- [ ] T006 Normalize the generated artifact result envelope in `src/compiler/pipeline.ts` and `src/compiler/irBuilder.ts`
- [ ] T007 [P] Add shared compiler fixture builders in `src/__tests__/compiler/helpers.ts` and `src/test/setup.ts`
- [ ] T008 Add generated-artifact UI state wiring in `src/components/MoveSourcePanel.tsx` and `src/components/CompilationStatus.tsx`

**Checkpoint**: Compiler contracts, deterministic helpers, and workflow state are ready for user story implementation.

---

## Phase 3: User Story 1 - Generate a functional contract from every supported DAG (Priority: P1) 🎯 MVP

**Goal**: Produce compile-ready, deterministic contract artifacts for all supported DAGs in the current node model.

**Independent Test**: Run supported DAG fixtures through the pipeline twice and confirm they emit identical compile-ready artifacts with stable traces and manifests.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add deterministic IR ordering tests in `src/__tests__/compiler/irBuilder.test.ts`
- [ ] T010 [P] [US1] Add canonical artifact emission tests in `src/__tests__/compiler/emitter.test.ts`
- [ ] T011 [P] [US1] Add supported-DAG pipeline generation tests in `src/__tests__/compiler/pipeline.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement canonical DAG traversal and stable trace assembly in `src/compiler/irBuilder.ts`
- [ ] T013 [US1] Implement deterministic contract identity and manifest emission in `src/compiler/emitter.ts`
- [ ] T014 [P] [US1] Align event and data accessor generator output in `src/compiler/generators/eventTriggers.ts` and `src/compiler/generators/dataAccessors.ts`
- [ ] T015 [P] [US1] Align logic and scoring generator output in `src/compiler/generators/logicGates.ts` and `src/compiler/generators/scoringModifiers.ts`
- [ ] T016 [P] [US1] Align action and shared generator helpers in `src/compiler/generators/actions.ts` and `src/compiler/generators/shared.ts`
- [ ] T017 [US1] Assemble compile-ready generated artifacts in `src/compiler/pipeline.ts` and `src/compiler/types.ts`

**Checkpoint**: Supported DAGs now generate deterministic, compile-ready artifacts.

---

## Phase 4: User Story 2 - Fail early when a DAG cannot become a functional contract (Priority: P1)

**Goal**: Block unsupported or incomplete DAGs before emission or compilation, with precise diagnostics tied to graph and artifact context.

**Independent Test**: Execute unsupported and structurally invalid DAG fixtures and confirm generation stops before compile while exposing explicit blocking diagnostics.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add structural and semantic validator failure tests in `src/__tests__/compiler/validator.test.ts`
- [ ] T019 [P] [US2] Add compiler diagnostic and fallback mapping tests in `src/__tests__/compiler/errorParser.test.ts` and `src/__tests__/compiler/moveCompiler.test.ts`
- [ ] T020 [P] [US2] Add unsupported-case regression tests in `src/__tests__/compiler/pipeline.test.ts` and `src/__tests__/compiler/sanitizer.test.ts`

### Implementation for User Story 2

- [ ] T021 [US2] Implement supported-versus-unsupported DAG classification in `src/compiler/validator.ts` and `src/compiler/types.ts`
- [ ] T022 [US2] Implement blocking dependency-readiness states for compilation in `src/compiler/moveCompiler.ts` and `src/compiler/pipeline.ts`
- [ ] T023 [US2] Preserve artifact-to-graph diagnostic traces in `src/compiler/errorParser.ts` and `src/compiler/emitter.ts`
- [ ] T024 [US2] Surface invalid graph and compile-blocked states in `src/nodes/BaseNode.tsx` and `src/components/CompilationStatus.tsx`
- [ ] T025 [US2] Restore and persist validation messaging for broken or migrated flows, supporting FR-013 and FR-018, in `src/components/restoreSavedFlow.ts` and `src/components/Footer.tsx`

**Checkpoint**: Unsupported and incomplete DAGs fail safely before compilation with actionable diagnostics.

---

## Phase 5: User Story 3 - Verify generated contracts against reference DAG semantic expectations (Priority: P2)

**Goal**: Lock the supported contract surface behind a reference DAG library with deterministic semantic and snapshot validation.

**Independent Test**: Run the reference DAG validation suite and confirm supported cases pass semantic plus fingerprint checks while unsupported cases fail with expected blockers.

### Tests for User Story 3

- [ ] T026 [P] [US3] Add supported `smart-turrets` reference DAG semantic regression tests derived from `docs/CONTRACT_EXAMPLES.md` in `src/__tests__/compiler/referenceDagValidation.test.ts`
- [ ] T027 [P] [US3] Add deterministic artifact fingerprint snapshot tests for the `smart-turrets` DAG inventory in `src/__tests__/compiler/referenceDagValidation.test.ts`
- [ ] T028 [P] [US3] Add browser regression for preview/build artifact consistency in `tests/e2e/generated-contracts.spec.ts`

### Implementation for User Story 3

- [ ] T029 [US3] Implement the reference DAG catalog and support matrix derived from `Scetrov/smart-turrets` and keyed to `docs/CONTRACT_EXAMPLES.md` in `src/__tests__/compiler/referenceDagFixtures.ts` and `src/compiler/types.ts`
- [ ] T030 [US3] Implement semantic outcome assertions and artifact fingerprint helpers from the concrete behaviors in `docs/CONTRACT_EXAMPLES.md` in `src/__tests__/compiler/referenceArtifactAssertions.ts` and `src/__tests__/compiler/helpers.ts`
- [ ] T031 [US3] Wire reference DAG validation into compiler regression coverage using the contract example mappings in `src/__tests__/compiler/pipeline.test.ts` and `src/__tests__/compiler/smartTurretExtensionAlignment.test.ts`
- [ ] T032 [US3] Add compile-validation coverage for every supported `smart-turrets` reference DAG and contract example mapping in `src/__tests__/compiler/referenceDagValidation.test.ts` and `scripts/real-wasm-integration.ts`
- [ ] T033 [US3] Document deterministic snapshot approval and full-inventory compile validation workflow from `docs/CONTRACT_EXAMPLES.md` in `specs/010-functional-dag-contracts/quickstart.md` and `src/__tests__/compiler/referenceDagValidation.test.ts`

**Checkpoint**: Reference DAG validation protects the supported generation surface from future regressions.

---

## Phase 6: User Story 4 - Review, compile, and prepare generated contracts for deployment, authorization, and upgrade flows (Priority: P2)

**Goal**: Make the generated artifact the single source of truth across preview, build, deploy preparation, and existing-turret authorization readiness workflows.

**Independent Test**: Generate and compile a supported DAG, then verify preview, build status, and authorization-readiness UI all consume the same artifact and show blocked or ready states correctly.

### Tests for User Story 4

- [ ] T034 [P] [US4] Add generated-artifact preview and build-state tests in `src/__tests__/MoveSourcePanel.test.tsx` and `src/__tests__/App.compilation.test.tsx`
- [ ] T035 [P] [US4] Add authorization readiness component tests in `src/__tests__/CompilationStatus.test.tsx` and `src/__tests__/Header.test.tsx`
- [ ] T036 [P] [US4] Add existing-turret authorization workflow coverage in `tests/e2e/authorization-readiness.spec.ts`
- [ ] T037 [P] [US4] Add negative-scope regression coverage ensuring anchor, online, offline, and unanchor lifecycle actions are not surfaced in `src/__tests__/Header.test.tsx` and `tests/e2e/authorization-readiness.spec.ts`

### Implementation for User Story 4

- [ ] T038 [US4] Make generated artifacts the single source of truth for preview and compile flows in `src/compiler/pipeline.ts` and `src/components/MoveSourcePanel.tsx`
- [ ] T039 [US4] Wire compile-ready artifact status through build and preview actions in `src/components/Header.tsx` and `src/components/Footer.tsx`
- [ ] T040 [US4] Implement existing-turret authorization readiness state in `src/compiler/types.ts` and `src/compiler/moveCompiler.ts`
- [ ] T041 [US4] Surface authorization next actions and blocked reasons in `src/components/CompilationStatus.tsx` and `src/components/MoveSourcePanel.tsx`
- [ ] T042 [US4] Integrate deploy and upgrade preparation with the generated artifact contract in `src/components/Header.tsx` and `src/components/MoveSourcePanel.tsx`

**Checkpoint**: Preview, build, deploy preparation, and authorization readiness all operate on the same generated artifact.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish cross-story hardening, documentation, and full verification.

- [ ] T043 [P] Update deterministic implementation guidance in `specs/010-functional-dag-contracts/quickstart.md` and `README.md`
- [ ] T044 Harden sanitizer regression coverage for cross-story safety in `src/compiler/sanitizer.ts` and `src/__tests__/compiler/sanitizer.test.ts`
- [ ] T045 Run full quickstart validation and capture cross-cutting verification notes for FR-021, FR-031, and FR-032 in `specs/010-functional-dag-contracts/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks all user story work.
- **Phase 3: User Story 1**: Depends on Phase 2.
- **Phase 4: User Story 2**: Depends on Phase 2 and should land after the artifact contract from User Story 1 stabilizes.
- **Phase 5: User Story 3**: Depends on Phase 2 and benefits from User Stories 1 and 2 being in place because it validates supported and unsupported boundaries.
- **Phase 6: User Story 4**: Depends on Phase 2 and requires the generated artifact and diagnostic contracts from User Stories 1 and 2.
- **Phase 7: Polish**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: First delivery slice and MVP.
- **User Story 2 (P1)**: Depends on foundational compiler contracts; recommended immediately after US1 because it formalizes safe failure around the same artifact pipeline.
- **User Story 3 (P2)**: Depends on the canonical generator and validator behavior from US1 and US2.
- **User Story 4 (P2)**: Depends on the canonical generated artifact and readiness states established in US1 and US2.

### Suggested Completion Order

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: User Story 1
4. Phase 4: User Story 2
5. Phase 5: User Story 3
6. Phase 6: User Story 4
7. Phase 7: Polish

---

## Parallel Opportunities

- **Setup**: T003 can run alongside T001 and T002.
- **Foundational**: T007 can run in parallel after T004 starts stabilizing the compiler contracts.
- **User Story 1**: T009, T010, and T011 can run in parallel. T014, T015, and T016 can run in parallel after T012 and T013 define canonical generator rules.
- **User Story 2**: T018, T019, and T020 can run in parallel. T024 and T025 can run in parallel after T021 through T023 define diagnostics.
- **User Story 3**: T026, T027, and T028 can run in parallel. T029 and T030 can progress together once fixture shape is stable.
- **User Story 4**: T034, T035, T036, and T037 can run in parallel. T039 and T041 can run in parallel after T038 and T040 define shared artifact state.
- **Polish**: T043 and T044 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Parallel test work
T009 Add deterministic IR ordering tests in src/__tests__/compiler/irBuilder.test.ts
T010 Add canonical artifact emission tests in src/__tests__/compiler/emitter.test.ts
T011 Add supported-DAG pipeline generation tests in src/__tests__/compiler/pipeline.test.ts

# Parallel generator alignment work
T014 Align event and data accessor generator output in src/compiler/generators/eventTriggers.ts and src/compiler/generators/dataAccessors.ts
T015 Align logic and scoring generator output in src/compiler/generators/logicGates.ts and src/compiler/generators/scoringModifiers.ts
T016 Align action and shared generator helpers in src/compiler/generators/actions.ts and src/compiler/generators/shared.ts
```

## Parallel Example: User Story 4

```bash
# Parallel test work
T034 Add generated-artifact preview and build-state tests in src/__tests__/MoveSourcePanel.test.tsx and src/__tests__/App.compilation.test.tsx
T035 Add authorization readiness component tests in src/__tests__/CompilationStatus.test.tsx and src/__tests__/Header.test.tsx
T036 Add existing-turret authorization workflow coverage in tests/e2e/authorization-readiness.spec.ts
T037 Add negative-scope regression coverage ensuring anchor, online, offline, and unanchor lifecycle actions are not surfaced in src/__tests__/Header.test.tsx and tests/e2e/authorization-readiness.spec.ts

# Parallel workflow surfacing work
T039 Wire compile-ready artifact status through build and preview actions in src/components/Header.tsx and src/components/Footer.tsx
T041 Surface authorization next actions and blocked reasons in src/components/CompilationStatus.tsx and src/components/MoveSourcePanel.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Deliver User Story 1 to establish deterministic compile-ready artifact generation.
3. Validate artifact determinism with Vitest before expanding the failure and workflow surfaces.

### Incremental Delivery

1. Add User Story 1 to make supported DAG generation real.
2. Add User Story 2 to enforce safe failure boundaries.
3. Add User Story 3 to lock the behavior behind reference DAG regression coverage.
4. Add User Story 4 to connect the artifact to preview, build, deploy preparation, and authorization readiness.
5. Finish with cross-cutting documentation and full verification.

### Verification Standard

- Run `bun run typecheck` and `bun run test:run` continuously during story development.
- Treat `src/__tests__/compiler/*.test.ts` as the primary regression surface.
- Use `bun run test:real-wasm` as a smoke gate before closing US3 and US4.
- Use `bun run test:e2e` before closing the final polish phase.
