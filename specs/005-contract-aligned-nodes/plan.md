# Implementation Plan: Contract-Aligned Nodes

**Branch**: `005-contract-aligned-nodes` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-contract-aligned-nodes/spec.md`

## Summary

Replace the 9 placeholder node definitions with 29 contract-aligned definitions extracted from `docs/CONTRACTS.md`. Each node maps to a reusable concept from the eight exemplar turret strategy contracts — data accessors for `TargetCandidateArg` fields, scoring modifiers for weight accumulation, logic gates for candidate exclusion, data sources for on-chain config objects, and event triggers for entry points. Individual node component files are replaced by a factory pattern. All existing tests are updated; new parameterized tests cover every definition.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES2022, ESM only)  
**Primary Dependencies**: React 19, @xyflow/react 12, lucide-react, Tailwind CSS 4, Vite  
**Storage**: N/A (static definitions, no persistence)  
**Testing**: Vitest (unit), @testing-library/react (component), Playwright (E2E)  
**Target Platform**: Browser (SPA)  
**Project Type**: Web application (frontend only)  
**Performance Goals**: 60 fps canvas interaction; sidebar renders <100ms with 29 nodes  
**Constraints**: No `any`; all nodes must render through `BaseNode`; socket types must use existing `SocketType` union  
**Scale/Scope**: 29 node definitions, ~10 files changed, ~5 files deleted, ~2 files created

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                            | Status  | Evidence                                                                                                                                                            |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Type Safety Above All**         | ✅ PASS | All definitions use `readonly` arrays; `NodeDefinition`, `SocketDefinition` interfaces enforced; no `any` usage; all socket types are members of `SocketType` union |
| **II. Visual Feedback is Paramount** | ✅ PASS | Sockets are colour-matched per design system tokens; nodes render via `BaseNode` with animated handles; drag-and-drop produces immediate visual feedback            |
| **III. Domain-Driven Design**        | ✅ PASS | Every node maps to a documented contract concept from `docs/CONTRACTS.md`; labels use EVE Frontier terminology (aggressor, tribe, HP ratio, etc.)                   |
| **IV. Predictable Code Generation**  | ✅ N/A  | This feature adds visual definitions only; code generation is decoupled and unchanged                                                                               |
| **V. Security by Default**           | ✅ PASS | Node labels are static constants, not user input; React's built-in escaping handles rendering; no external data involved                                            |
| **VI. Test-First Quality**           | ✅ PASS | Parameterized unit tests for all 29 definitions; updated integration and E2E tests; coverage target ≥90% on definition files                                        |
| **VII. Accessibility & Inclusion**   | ✅ PASS | `BaseNode` renders semantic HTML with ARIA labels; sidebar uses `role="complementary"`; focus states preserved; no new accessibility patterns needed                |

**Post-Phase 1 re-check**: All gates still pass. Factory pattern reduces complexity (fewer files, same interface). No new dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/005-contract-aligned-nodes/
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: complete node/socket schema
├── quickstart.md        # Phase 1: setup and verification
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── node-definitions.ts      # MODIFIED: 29 contract-aligned definitions
├── nodes/
│   ├── BaseNode.tsx              # UNCHANGED: shared node chrome
│   ├── createNode.tsx            # NEW: factory function + icon map
│   └── index.ts                  # MODIFIED: factory-generated registry
├── types/
│   └── nodes.ts                  # UNCHANGED: existing types sufficient
├── utils/
│   └── socketTypes.ts            # UNCHANGED: existing types sufficient
├── components/
│   ├── CanvasWorkspace.tsx        # MODIFIED: empty-state copy update
│   └── Sidebar.tsx               # UNCHANGED: renders from definitions array
└── __tests__/
    ├── nodeDefinitions.test.ts   # MODIFIED: parameterized tests for 29 definitions
    ├── canvasFlow.test.tsx        # MODIFIED: updated node type references
    └── Sidebar.test.tsx           # MODIFIED: updated fixture

tests/
└── e2e/
    └── sidebar.spec.ts           # UNCHANGED: uses generic selectors

# DELETED (replaced by factory):
# src/nodes/AggressionNode.tsx
# src/nodes/ProximityNode.tsx
# src/nodes/GetTribeNode.tsx
# src/nodes/ListOfTribeNode.tsx
# src/nodes/IsInListNode.tsx
# src/nodes/AddToQueueNode.tsx
# src/nodes/HpRatioNode.tsx
# src/nodes/ShieldRatioNode.tsx
# src/nodes/ArmorRatioNode.tsx
```

**Structure Decision**: Single-project SPA structure. This feature modifies the data and presentation layers only. The factory pattern (`createNode.tsx`) replaces 9 individual node files with a single factory, reducing the `src/nodes/` directory from 11 files to 3 files.

## Complexity Tracking

No constitution violations. No complexity justification needed.
