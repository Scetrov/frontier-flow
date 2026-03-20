# Implementation Plan: Functional DAG Contracts

**Branch**: `010-functional-dag-contracts` | **Date**: 2026-03-20 | **Spec**: [spec.md](/specs/010-functional-dag-contracts/spec.md)
**Input**: Feature specification from `specs/010-functional-dag-contracts/spec.md`

## Summary

Deliver deterministic DAG-to-Move contract generation for the current contract-aligned node model so every supported reference DAG derived from the `Scetrov/smart-turrets` contract inventory produces a compile-ready contract artifact that successfully compiles into a contract representative of that DAG. Treat [docs/CONTRACT_EXAMPLES.md](/docs/CONTRACT_EXAMPLES.md) as the concrete example catalog for those seed strategies and their expected targeting semantics. The artifact becomes the single source of truth for preview/build/deploy flows, and the workflow can prepare extension authorization against an existing turret without expanding into full turret lifecycle automation. The technical approach is a canonical compiler pipeline in TypeScript, backed by Vitest-heavy semantic and snapshot regression coverage, an explicit support matrix derived from `smart-turrets`, structured diagnostics, and compile/package contracts that remain stable across future node and generator changes.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, ES Modules  
**Primary Dependencies**: `@xyflow/react`, `@zktx.io/sui-move-builder`, `@mysten/sui`, `@mysten/dapp-kit`, `dagre`, `lucide-react`  
**Storage**: Browser localStorage and IndexedDB for existing graph and deployment metadata; no new persistence store required for this feature  
**Testing**: Vitest 4.1 for unit and integration coverage, Testing Library for component tests, Playwright for browser journeys, real WASM smoke validation via `bun run test:real-wasm`  
**Target Platform**: Browser-based React SPA with in-browser WASM compilation on Linux/macOS/Windows developer environments  
**Project Type**: Web application with an embedded compiler pipeline  
**Performance Goals**: Deterministic generation for supported reference DAGs, unit-test feedback in under 5 seconds, compile workflow remains responsive enough to preserve current auto-compile and preview UX targets  
**Constraints**: Strict TypeScript with no `any`, deterministic output is mandatory, fake timers instead of timing assertions, critical path coverage must remain at or above 90%, graceful failure when external world-package dependency resolution is unavailable  
**Scale/Scope**: Current contract-aligned node catalog, existing compiler pipeline under `src/compiler`, reference DAG inventory derived from the current `Scetrov/smart-turrets` contract set and concretized in [docs/CONTRACT_EXAMPLES.md](/docs/CONTRACT_EXAMPLES.md), extension authorization readiness for existing turrets only, and a long-term target of full support for the entire `smart-turrets` inventory

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Research Gate Review

- **I. Type Safety Above All**: PASS. Plan keeps all feature work in strict TypeScript, centered in the existing compiler and UI layers, with explicit contracts and no dynamic code generation shortcuts.
- **IV. Predictable Code Generation**: PASS. Feature scope is explicitly deterministic, requires stable identity and output, and centers on canonical IR, generation rules, and traceable artifacts.
- **V. Security by Default**: PASS. Sanitization, safe failure on unresolved dependencies, and structured diagnostics remain mandatory design constraints.
- **VI. Test-First Quality**: PASS. User request and project constitution both require Vitest-heavy deterministic technical tests, critical-path regression suites, fake timers, and browser workflow coverage.
- **VII. Accessibility & Inclusion**: PASS. UI changes implied by authorization readiness remain within existing preview/build/deploy surfaces and must preserve accessible diagnostics and interaction patterns.

### Post-Design Gate Review

- **I. Type Safety Above All**: PASS. Data model and contracts keep generator, artifact, and readiness states explicit and typed.
- **IV. Predictable Code Generation**: PASS. Research and contracts require canonical traversal, deterministic naming, reference DAG validation, and artifact-trace stability.
- **V. Security by Default**: PASS. Design preserves sanitizer enforcement, dependency-resolution failure boundaries, and non-opaque error reporting.
- **VI. Test-First Quality**: PASS. Quickstart and contracts require semantic assertions plus snapshot regression in Vitest, Playwright journey coverage, and real-WASM smoke verification.
- **VII. Accessibility & Inclusion**: PASS. Design keeps readiness and diagnostic states in existing accessible workflows rather than introducing opaque background-only behavior.

## Project Structure

### Documentation (this feature)

```text
specs/010-functional-dag-contracts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── authorization-readiness.md
│   ├── generated-contract-artifact.md
│   └── reference-dag-validation.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── compiler/
│   ├── emitter.ts
│   ├── errorParser.ts
│   ├── irBuilder.ts
│   ├── moveCompiler.ts
│   ├── optimiser.ts
│   ├── pipeline.ts
│   ├── sanitizer.ts
│   ├── types.ts
│   └── validator.ts
├── components/
│   ├── CompilationStatus.tsx
│   ├── Header.tsx
│   ├── MoveSourcePanel.tsx
│   └── restoreSavedFlow.ts
├── nodes/
│   ├── BaseNode.tsx
│   ├── NodeFieldEditor.tsx
│   └── createNode.tsx
├── __tests__/
│   ├── compiler/
│   ├── App.compilation.test.tsx
│   ├── CompilationStatus.test.tsx
│   ├── MoveSourcePanel.test.tsx
│   └── nodeDefinitions.test.ts
└── test/
    ├── graphInteractionTestUtils.ts
    └── setup.ts

tests/
└── e2e/
```

**Structure Decision**: Keep the existing single-project Vite React application structure. The feature is primarily a compiler-pipeline and workflow integration change rooted in `src/compiler`, with supporting UI wiring in `src/components` and deterministic regression coverage in `src/__tests__` plus `tests/e2e`.

## Complexity Tracking

No constitution violations identified. No additional complexity justification is required at planning time.
