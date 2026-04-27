# Tasks: Remove Reference-Template Shortcut

**Input**: Design documents from `/specs/022-remove-reference-template-shortcut/`
**Prerequisites**: `spec.md`, `plan.md`

`__tests__`: Tests are required because deterministic graph-to-Move generation and compiler regression coverage are explicit project requirements.

**Organization**: Tasks are grouped by implementation phase so the shortcut removal can be executed and verified incrementally.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel when dependencies are satisfied and files do not overlap
- **[Phase]**: Which implementation phase the task belongs to (`[PH1]`, `[PH2]`, `[PH3]`, `[PH4]`)
- Every task includes an exact file path

## Phase 1: Remove the Active Shortcut

**Purpose**: Eliminate the module-name-based emission path so the compiler always emits Move from the validated graph.

- [X] T001 [PH1] Remove the reference-template branch from `src/compiler/emitter.ts`
- [X] T002 [PH1] Delete the template-only emitter module at `src/compiler/referenceTemplates.ts`
- [X] T003 [PH1] Remove stale cleanup references from `TODO.md`

**Checkpoint**: No active compiler code path can emit Move purely from module name.

---

## Phase 2: Realign Graph-Driven Tests

**Purpose**: Replace template-selection assertions with graph-driven behavior checks and refresh deterministic expectations.

- [X] T004 [PH2] Replace the template-selection assertion with graph-mutation output coverage in `src/__tests__/compiler/pipeline.test.ts`
- [X] T005 [PH2] Rewrite supported reference artifact expectations around graph-emitted semantics in `src/__tests__/compiler/referenceArtifactAssertions.ts`
- [X] T006 [PH2] Refresh the supported reference artifact-id snapshot in `src/__tests__/compiler/referenceDagValidation.test.ts`

**Checkpoint**: Compiler regression tests assert graph semantics and determinism instead of template choice.

---

## Phase 3: Validate the Narrowed Compiler Slice

**Purpose**: Confirm the refactor is stable without widening scope beyond the touched TypeScript and Move generation path.

- [X] T007 [PH3] Run targeted compiler regressions with `bun run test:run src/__tests__/compiler`
- [X] T008 [PH3] Run narrowed repo validation with `bun run typecheck`

**Checkpoint**: The compiler-focused test slice and TypeScript validation are both green.

---

## Phase 4: Make Remaining Fixture Semantics Explicit

**Purpose**: Convert former template-only smart-turret behaviors into explicit graph or generator semantics.

- [X] T009 [PH4] Encode aggressor-first guard semantics explicitly in `src/__fixtures__/graphs/smartTurretExtensionFixtures.ts`, `src/compiler/generators/logicGates.ts`, and `src/__tests__/compiler/referenceDagValidation.test.ts`
- [X] T010 [PH4] Encode low-HP finisher weighting semantics explicitly in `src/__fixtures__/graphs/smartTurretExtensionFixtures.ts`, `src/compiler/generators/scoringModifiers.ts`, and `src/__tests__/compiler/referenceDagValidation.test.ts`
- [X] T011 [PH4] Encode player-screen exclusion and player-target semantics explicitly in `src/__fixtures__/graphs/smartTurretExtensionFixtures.ts`, `src/compiler/generators/logicGates.ts`, `src/compiler/generators/scoringModifiers.ts`, and `src/__tests__/compiler/referenceDagValidation.test.ts`

**Checkpoint**: Any remaining smart-turret behavior differences are modeled explicitly in the graph/generator layer rather than hidden behind module-name lookup.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** has no dependencies and removes the core hidden behavior.
- **Phase 2** depends on Phase 1 because tests must reflect the new emission path.
- **Phase 3** depends on Phases 1 and 2 because validation must run on the refactored code and updated assertions.
- **Phase 4** depends on Phase 3 because semantic parity work should begin only after the shortcut removal is stable.

### Parallel Opportunities

- `T001` and `T002` can run in parallel if one developer handles `src/compiler/emitter.ts` and another removes `src/compiler/referenceTemplates.ts`.
- `T004` through `T006` can run in parallel once Phase 1 lands because they touch separate compiler test files.
- `T009` through `T011` can be split by fixture family once the explicit semantic direction is agreed.

## Implementation Strategy

### Current Status

1. Phase 1 is complete.
2. Phase 2 is complete.
3. Phase 3 is complete.
4. Phase 4 is the remaining follow-up work.

### Next Slice

1. Start with `T009` to decide whether aggressor-first should gain explicit same-tribe and behaviour guards in the graph model or intentionally remain a simpler graph.
2. Then handle `T010` and `T011` to decide whether low-HP finisher and player-screen should gain new explicit nodes or accept reduced semantics.

## Notes

- The completed phases reflect implementation already landed in the compiler pipeline and tests.
- This spec intentionally leaves semantic-parity follow-up as explicit work instead of hiding it behind another shortcut.