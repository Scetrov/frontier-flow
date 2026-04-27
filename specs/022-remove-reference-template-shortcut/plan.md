# Implementation Plan: Remove Reference-Template Shortcut

**Branch**: `022-remove-reference-template-shortcut` | **Date**: 2026-04-27 | **Spec**: `/home/scetrov/source/frontier-flow/specs/022-remove-reference-template-shortcut/spec.md`
**Input**: Feature specification from `/home/scetrov/source/frontier-flow/specs/022-remove-reference-template-shortcut/spec.md`

## Summary

Remove the module-name-based Move template shortcut from the TypeScript compiler pipeline so all emitted Move artifacts come from the validated graph and generic generator path. The refactor keeps deterministic artifact generation intact, rewrites compiler tests around graph semantics instead of template selection, and leaves any remaining smart-turret semantic gaps explicit for follow-up work in the graph and generator model.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) for the compiler pipeline; Move as the generated contract artifact
**Primary Dependencies**: Vitest 4.x, existing compiler pipeline in `src/compiler`, graph fixtures in `src/__fixtures__/graphs`, Move fixtures in `src/__fixtures__/move`
**Storage**: In-memory compiler artifacts and deterministic snapshots only
**Testing**: Targeted compiler regression tests in `src/__tests__/compiler`, plus `bun run typecheck`
**Target Platform**: Browser-hosted frontend compiler pipeline with in-browser Move compilation
**Constraints**: No hidden module-name special cases, no `any`, deterministic output for unchanged graphs, fixture semantics must be explicit in graph/generator logic
**Scope**: Compiler emission path, compiler tests, fixture expectations, and small doc/comment cleanup

## Constitution Check

- **Type Safety Above All**: PASS. The work stays inside the strict TypeScript compiler path.
- **Visual Feedback is Paramount**: PASS. The refactor changes generation correctness, not the surrounding preview/build surfaces.
- **Domain-Driven Design**: PASS. Supported turret behavior must now be modeled in graph semantics rather than hidden templates.
- **Predictable Code Generation**: PASS. Determinism remains a first-class constraint.
- **Security by Default**: PASS. The change removes hidden behavior rather than adding dynamic or unsafe paths.
- **Test-First Quality**: PASS. Compiler regression tests were updated around graph-driven output and rerun.

## Project Structure

### Documentation (this feature)

```text
specs/022-remove-reference-template-shortcut/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── compiler/
│   ├── emitter.ts
│   └── generators/
├── __fixtures__/
│   └── graphs/
└── __tests__/
    └── compiler/
```

**Structure Decision**: Keep all implementation inside the existing TypeScript compiler path and corresponding compiler tests. Move behavior changes remain expressed as generated source artifacts rather than a new runtime or deployment surface.

## Phase Breakdown

### Phase 1: Remove the Active Shortcut

Delete the module-name template branch from `src/compiler/emitter.ts`, remove the old `src/compiler/referenceTemplates.ts` module, and clean up direct references.

**Status**: Complete.

### Phase 2: Realign Regression Coverage

Replace template-selection assertions with graph-driven behavior assertions, update artifact expectation helpers to inspect generated graph semantics, and refresh deterministic snapshots that changed because emitted Move changed.

**Status**: Complete.

### Phase 3: Validate the Compiler Slice

Run targeted compiler regressions and TypeScript validation to prove the narrowed refactor is stable.

**Status**: Complete.

### Phase 4: Make Remaining Fixture Semantics Explicit

For any smart-turret fixture that previously relied on hidden template semantics, encode the behavior explicitly in graph fixtures, node composition, or generator logic rather than restoring a module-name shortcut.

**Status**: Pending follow-up.

## Implementation Notes

- The current compiler slice is green with targeted tests and typecheck.
- `turret_size_priority` appears semantically expressible through the generic pipeline as-is.
- `turret_aggressor_first`, `turret_low_hp_finisher`, and `turret_player_screen` still have semantic gaps versus the former canned templates; those gaps are now visible instead of hidden.