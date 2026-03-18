# Implementation Plan: WASM Contract Compilation Pipeline

**Branch**: `006-wasm-compile-pipeline` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-wasm-compile-pipeline/spec.md`

## Summary

Transform the visual node graph into valid Sui Move source code via a multi-phase compilation pipeline (IR construction → validation → sanitisation → optimisation → emission), compile it in-browser using `@zktx.io/sui-move-builder/lite` WASM, and provide real-time feedback through auto-compile-on-idle, a footer status indicator (Idle/Compiling/Compiled/Error), a header Build button, and compiler error traceability back to canvas nodes.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES2022, ES Modules), React 19  
**Primary Dependencies**: `@xyflow/react`, `@zktx.io/sui-move-builder` (WASM), Vite, Tailwind CSS 4  
**Storage**: N/A (all compilation in-memory; graph persistence covered by existing contract library)  
**Testing**: Vitest (unit + integration), Playwright (E2E), @testing-library/react  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari — WASM required)  
**Project Type**: Web application (SPA)  
**Performance Goals**: Code generation < 1s, WASM compilation < 5s for typical graphs, status indicator updates < 200ms  
**Constraints**: Browser memory limits for large graphs (R-14), WASM binary lazy-loaded, no server-side compilation  
**Scale/Scope**: 31 node types, typical graphs 5–30 nodes, max ~100 nodes before memory pressure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety Above All | ✅ PASS | All pipeline types use strict TypeScript, discriminated unions for compilation states, no `any` |
| II. Visual Feedback is Paramount | ✅ PASS | Footer status indicator with colour-coded states, node-level error highlighting, Build button states |
| III. Domain-Driven Design | ✅ PASS | Node types map to EVE Frontier contract concepts; generated code speaks the game domain |
| IV. Predictable Code Generation | ✅ PASS | Deterministic output is a core requirement (FR-010); multi-phase pipeline with sanitisation |
| V. Security by Default | ✅ PASS | Input sanitisation phase (FR-007), injection prevention, error boundaries for WASM failures |
| VI. Test-First Quality | ✅ PASS | 33 FR includes 6 testing requirements; ≥90% coverage for code gen pipeline; Vitest mocks for WASM |
| VII. Accessibility & Inclusion | ✅ PASS | Status indicator uses both colour and text labels; ARIA attributes on status and Build button |
| Architecture: border-radius 0px | ✅ PASS | All new UI elements follow sharp angular styling |
| Architecture: Lazy-load heavy deps | ✅ PASS | WASM binary lazy-loaded on first compilation (FR-012) |
| Architecture: Debounce high-freq events | ✅ PASS | Idle timer debounces graph edits (FR-013, FR-014) |
| Workflow: Feature branches only | ✅ PASS | Working on `006-wasm-compile-pipeline` branch |
| Workflow: Test-first mandatory | ✅ PASS | Test requirements defined before implementation |

**Gate Result**: ✅ All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/006-wasm-compile-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── compilation-pipeline.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── compiler/
│   ├── types.ts                    # IR types, CompilerDiagnostic, CompilationStatus
│   ├── irBuilder.ts                # Phase 1: React Flow → IR
│   ├── validator.ts                # Phase 2: Constraint engine
│   ├── sanitiser.ts                # Phase 3: Input sanitisation
│   ├── optimiser.ts                # Phase 3.5: AST pruning & gas optimisation
│   ├── emitter.ts                  # Phase 4: IR → Move source + source map
│   ├── errorParser.ts              # Compiler error → node mapping
│   ├── moveCompiler.ts             # WASM wrapper (lazy-load, compile, error catch)
│   ├── pipeline.ts                 # Orchestrator: validate → generate → compile
│   └── generators/                 # Per-node-type code generators
│       ├── index.ts                # Generator registry
│       ├── eventTriggers.ts        # aggression, proximity
│       ├── dataAccessors.ts        # getTribe, hpRatio, shieldRatio, etc.
│       ├── scoringModifiers.ts     # behaviourBonus, aggressorBonus, etc.
│       ├── logicGates.ts           # excludeOwner, excludeSameTribe, isInList, etc.
│       ├── dataSources.ts          # groupBonusConfig, roundRobinConfig, etc.
│       └── actions.ts              # addToQueue
├── hooks/
│   └── useAutoCompile.ts           # Idle timer + auto-compile orchestration
├── components/
│   ├── Footer.tsx                  # Updated: compilation status indicator
│   ├── Header.tsx                  # Updated: Build button
│   └── CompilationStatus.tsx       # Status dot + label component
├── types/
│   └── nodes.ts                    # Existing (no changes expected)
└── __tests__/
    ├── compiler/
    │   ├── irBuilder.test.ts       # IR construction tests
    │   ├── validator.test.ts       # Validation phase tests
    │   ├── sanitiser.test.ts       # Sanitisation tests
    │   ├── optimiser.test.ts       # Optimisation pass tests
    │   ├── emitter.test.ts         # Code emission + source map tests
    │   ├── errorParser.test.ts     # Error parsing + node mapping tests
    │   ├── pipeline.test.ts        # End-to-end pipeline tests
    │   └── generators/
    │       ├── eventTriggers.test.ts
    │       ├── dataAccessors.test.ts
    │       ├── scoringModifiers.test.ts
    │       ├── logicGates.test.ts
    │       ├── dataSources.test.ts
    │       └── actions.test.ts
    ├── hooks/
    │   └── useAutoCompile.test.ts  # Debounce timer tests
    ├── CompilationStatus.test.ts
    ├── Footer.test.ts              # Updated: status indicator tests
    └── Header.test.ts              # Updated: Build button tests

src/__fixtures__/
├── graphs/
│   ├── default-graph.json          # Standard 5-node turret graph
│   ├── empty-graph.json            # No nodes or edges
│   ├── disconnected-graph.json     # Disconnected subgraphs
│   ├── cyclic-graph.json           # Graph with cycle
│   ├── large-graph.json            # 50+ nodes
│   └── minimal-graph.json          # Single event-trigger node
├── move/
│   ├── default-turret.move         # Expected Move output snapshot
│   ├── single-proximity.move       # Minimal graph snapshot
│   └── full-graph.move             # All node types snapshot
└── compiler/
    ├── bytecode-fixture.ts         # Pre-compiled bytecode mock
    └── error-fixtures.ts           # Move compiler error output samples

tests/e2e/
├── compilation.spec.ts             # Auto-compile, status indicator, Build button
└── error-surfacing.spec.ts         # Validation errors, compiler errors on canvas
```

**Structure Decision**: New `src/compiler/` directory houses the entire compilation pipeline, keeping it cleanly separated from the UI layer per Constitution principle "Separation of Concerns". The pipeline is fully decoupled from React — it operates on plain TypeScript data structures. The `useAutoCompile` hook is the only bridge between the React component tree and the compiler pipeline. Generators are grouped by node category to keep individual files focused and testable.

## Complexity Tracking

No constitution violations. No complexity justification required.

## Constitution Re-Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety Above All | ✅ PASS | `CompilationStatus` uses discriminated union; all IR types strictly typed |
| II. Visual Feedback is Paramount | ✅ PASS | Four-state status indicator; node-level error highlighting; Build button disabled state |
| III. Domain-Driven Design | ✅ PASS | Generator names match EVE Frontier contract concepts |
| IV. Predictable Code Generation | ✅ PASS | Deterministic pipeline; source map traceability; snapshot tests |
| V. Security by Default | ✅ PASS | Sanitiser is a mandatory discrete phase; WASM pinned to exact version |
| VI. Test-First Quality | ✅ PASS | Per-generator tests, per-phase tests, pipeline integration tests, E2E tests |
| VII. Accessibility & Inclusion | ✅ PASS | Status uses colour + text; ARIA live region for status changes |
| Architecture constraints | ✅ PASS | Lazy WASM, debounced events, 0px borders, no global state lib |

**Post-Design Gate Result**: ✅ All gates pass.