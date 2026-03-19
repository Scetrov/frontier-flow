# Implementation Plan: Extension Node Primitive Refactor

**Branch**: `008-extension-node-primitives` | **Date**: 2026-03-19 | **Spec**: `/home/scetrov/source/frontier-flow/specs/008-extension-node-primitives/spec.md`
**Input**: Feature specification from `/home/scetrov/source/frontier-flow/specs/008-extension-node-primitives/spec.md`

## Summary

Refactor the extension-node system so runtime-dead config objects are removed, bundled logic nodes are replaced by explicit primitive predicates plus `NOT`/`AND`/`OR`/`XOR` composition, list-valued node data becomes editable and persistent, and the Load panel ships curated example contracts by default. The implementation will extend the existing node-definition registry, flow hydration/restore path, contract-library persistence, and compiler generator surface while preserving legacy saved graphs through exact auto-migration and actionable remediation notices for unmappable content.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) for application logic, HTML5 for document structure, CSS with Tailwind CSS 4 and project CSS variables, Bun for package/runtime tooling  
**Primary Dependencies**: React 19, `@xyflow/react` 12.x, Tailwind CSS 4, Vite, Bun, existing compiler/generator infrastructure under `src/compiler/`  
**Storage**: Browser `localStorage` contract library under `frontier-flow:contracts`; transient in-memory node editor state during canvas editing  
**Testing**: Vitest, React Testing Library, existing node/compiler fixtures, Playwright for end-to-end canvas and Load panel verification  
**Target Platform**: Browser-based frontend on desktop-class clients using Bun-based development/build workflows  
**Project Type**: Frontend web application with canvas-based graph editing and deterministic code generation  
**Performance Goals**: Canvas interactions remain visually immediate, list editor interactions feel synchronous, example contracts populate the Load panel on first open without perceptible delay, and restore/migration of supported legacy graphs completes within the normal canvas load path for graphs up to roughly 50 nodes  
**Constraints**: Strict TypeScript with no `any`; deterministic node and code-generation behavior; no silent data loss during legacy restore; preserve accessibility and keyboard reachability; keep changes within the existing frontend architecture and Bun/Vite toolchain  
**Scale/Scope**: Update the current extension-node subset and related load/restore flows, add 4 boolean operator nodes plus direct predicate replacements, introduce typed editable field support for list data, and seed a small curated example contract set

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Type Safety Above All**: PASS. The plan extends existing typed node definitions and persisted flow shapes rather than introducing untyped config blobs.
- **Visual Feedback is Paramount**: PASS. Field editing, remediation, and seeded examples remain visible within existing canvas and panel UI patterns.
- **Domain-Driven Design**: PASS. The refactor moves the node catalogue closer to EVE Frontier domain primitives instead of abstract config carriers.
- **Predictable Code Generation**: PASS. Removing non-functional config objects reduces hidden behavior and keeps generator semantics explicit and deterministic.
- **Security by Default**: PASS. Persisted node fields remain validated, local-only, and rendered through existing React escaping; no new secret-bearing surfaces are introduced.
- **Test-First Quality**: PASS. The design includes unit coverage for node schemas/migrations and UI/E2E coverage for editing and loading flows.
- **Accessibility & Inclusion**: PASS. Load panel and field editor behavior stay inside semantic HTML/keyboard reachable interfaces already required by the constitution.

**Post-Design Re-check**: PASS. Phase 1 artifacts keep the feature inside the existing React/Bun/Tailwind architecture, require no constitution exceptions, and make legacy handling more explicit rather than more complex.

## Project Structure

### Documentation (this feature)

```text
specs/008-extension-node-primitives/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── contract-library-interface.md
│   └── node-field-and-migration-interface.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── CanvasWorkspace.tsx
│   ├── restoreSavedFlow.ts
│   └── [new field editor components]
├── data/
│   ├── node-definitions.ts
│   ├── kitchenSinkFlow.ts
│   └── [new example contract and migration data]
├── nodes/
│   ├── BaseNode.tsx
│   ├── createNode.tsx
│   └── index.ts
├── compiler/
│   └── generators/
├── types/
│   └── nodes.ts
├── utils/
│   └── contractStorage.ts
├── __fixtures__/
│   └── graphs/
└── __tests__/

tests/
└── e2e/
```

**Structure Decision**: Keep the existing single-app frontend structure. Node schemas, migration metadata, and example contracts live under `src/data/` and `src/types/`; node rendering and field-editing UI stay in `src/nodes/` and `src/components/`; persistence changes stay in `src/utils/contractStorage.ts` plus `src/components/restoreSavedFlow.ts`; generator changes stay inside `src/compiler/generators/`; verification remains split across unit/component tests and `tests/e2e/`.

## Complexity Tracking

No constitution violations or extra justification entries are required for this plan.
