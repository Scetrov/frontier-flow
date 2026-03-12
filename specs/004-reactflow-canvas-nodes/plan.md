# Implementation Plan: ReactFlow Canvas Node Components

**Branch**: `004-reactflow-canvas-nodes` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-reactflow-canvas-nodes/spec.md`

## Summary

Implement 9 verified ReactFlow custom node components (Proximity, Aggression, Get Tribe, List of Tribe, Is In List, Add to Queue, HP Ratio, Shield Ratio, Armor Ratio) on an interactive canvas. Each node declares typed input/output sockets mapped to operations in the `world::turret` reference contract. A socket type system with compatibility matrix enforces type-safe connections. The existing static hero section in App.tsx is replaced with a live ReactFlow canvas supporting drag-and-drop from the sidebar, animated colour-coded edges, node/edge deletion, and cycle prevention.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES2022 target, ES Modules only, `any` forbidden)
**Primary Dependencies**: `@xyflow/react` ^12.10.0, `react` ^19.2.0, `lucide-react` ^0.563.0, `dagre` ^0.8.5
**Storage**: N/A (client-side state only — ReactFlow hooks manage nodes/edges in memory)
**Testing**: Vitest + @testing-library/react (unit), Playwright (E2E)
**Target Platform**: Web SPA (browser, Vite dev server / static build)
**Project Type**: web-app (single-page visual editor)
**Performance Goals**: 60fps canvas interactions (pan, zoom, drag), instant node placement on drop
**Constraints**: All 9 node types must map 1:1 to verified operations in the `turret.move` reference contract — zero speculative nodes. Border-radius 0px globally.
**Scale/Scope**: 9 node types, up to ~50 node instances per canvas, 11 socket types, 5 Move core types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Type Safety Above All | PASS | All types defined as TypeScript interfaces with `readonly` fields. `SocketType` is a string union — no `any` in type definitions. `socketCompatibility` is typed as `Record<SocketType, readonly SocketType[]>`. |
| II | Visual Feedback is Paramount | PASS | Sockets colour-coded by Move core type. Edges animated with source-type colouring. Connection validation provides immediate accept/reject feedback. Hover effects on sockets (scale + glow). |
| III | Domain-Driven Design | PASS | All 9 node types map directly to EVE Frontier turret contract operations. Categories (Event Trigger, Data Accessor, Logic Gate, Action) reflect game domain taxonomy. |
| IV | Predictable Code Generation | PASS | Feature does not implement code generation but ensures every node's sockets correspond to verified Move operations, providing a sound foundation for deterministic code gen. Type-safe connections prevent invalid graph structures. |
| V | Security by Default | PASS | No user-generated content is rendered unsafely — labels come from static definitions. No external API calls. React's built-in escaping handles all text rendering. |
| VI | Test-First Quality | PASS | Plan includes unit tests for socket validation, node rendering, connection logic, and cycle detection. E2E tests for drag-and-drop workflow. Coverage targets: ≥90% for connection logic, ≥70% overall. |
| VII | Accessibility & Inclusion | PASS | Nodes will use semantic ARIA attributes. Handles will be keyboard-focusable. Delete via keyboard (Delete/Backspace). Canvas navigation via keyboard pan. |

### Post-Design Re-Check

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Type Safety | PASS | `SocketDefinition`, `NodeCategory`, extended `NodeDefinition` all use discriminated unions and readonly fields. No `any` in interfaces (the `any` socket type is a domain string literal, not TypeScript `any`). |
| II | Visual Feedback | PASS | Diamond shape for IsInList differentiates logic gates visually. Socket hover pulse animation defined in CSS. Edge colours provide data-flow traceability. |
| III | Domain-Driven | PASS | Node-to-contract mapping table verified. File names match domain concepts (AggressionNode, ProximityNode, etc.). |
| IV | Code Generation | PASS | Socket definitions in `data-model.md` capture the exact Move function/field each node maps to. Edge data carries sourceHandle for downstream code gen. |
| V | Security | PASS | No dynamic content injection. Node IDs use `dnd_${counter}_${Date.now()}` — no user input in IDs. |
| VI | Test-First | PASS | Research identified 4 test categories: socket compatibility, node rendering, connection validation, cycle detection. |
| VII | Accessibility | PASS | Research confirms keyboard delete support and ARIA labelling strategy. |

**Gate Result**: ALL PASS — no violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/004-reactflow-canvas-nodes/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions and rationale
├── data-model.md        # Phase 1: type definitions and socket specifications
├── quickstart.md        # Phase 1: setup and verification steps
├── checklists/
│   └── requirements.md  # Quality gate checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── App.tsx                       # Modified: ReactFlowProvider + DnDFlow integration
├── index.css                     # Modified: add node and socket CSS classes
├── types/
│   └── nodes.ts                  # Modified: extended NodeDefinition, SocketDefinition, SocketType, NodeCategory
├── data/
│   └── node-definitions.ts       # Modified: 9 verified nodes with full socket metadata
├── nodes/
│   ├── index.ts                  # New: nodeTypes registry mapping type strings to components
│   ├── AggressionNode.tsx        # New: event trigger node component
│   ├── ProximityNode.tsx         # New: event trigger node component
│   ├── GetTribeNode.tsx          # New: data accessor node component
│   ├── ListOfTribeNode.tsx       # New: data source node component
│   ├── IsInListNode.tsx          # New: logic gate node component (diamond shape)
│   ├── AddToQueueNode.tsx        # New: action node component
│   ├── HpRatioNode.tsx           # New: data accessor node component
│   ├── ShieldRatioNode.tsx       # New: data accessor node component
│   └── ArmorRatioNode.tsx        # New: data accessor node component
├── utils/
│   └── socketTypes.ts            # New: socket type system, colours, compatibility matrix, validation
├── components/
│   └── Sidebar.tsx               # Modified: updated to use extended NodeDefinition with sockets
└── __tests__/
    ├── socketTypes.test.ts       # New: unit tests for socket compatibility and validation
    ├── nodeDefinitions.test.ts   # New: unit tests for node definition integrity
    └── connectionValidation.test.ts # New: unit tests for cycle detection and connection logic

tests/
└── e2e/
    ├── canvas.spec.ts            # New: drag-and-drop, node placement, deletion E2E
    └── connections.spec.ts       # New: type-safe connections, edge styling E2E
```

**Structure Decision**: Single web-app structure following the existing `src/` layout established in features 001-003. New files are placed in `src/nodes/` (custom node components) and `src/utils/` (socket type system), both directories already exist or are specified in the HLD. Test files follow the existing `src/__tests__/` pattern for unit tests and `tests/e2e/` for Playwright tests.

## Complexity Tracking

No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_  | —          | —                                   |
