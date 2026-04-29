# 1. Implementation Plan: Node Engine Refactor

**Branch**: `024-node-engine-refactor` | **Date**: `2026-04-29` | **Spec**: `specs/024-node-engine-refactor/spec.md`
**Input**: Feature specification from `specs/024-node-engine-refactor/spec.md`

## 1.1. Summary

Introduce a new `enteredAttacked` authoring node that supersedes `aggression` and `proximity`, preserve legacy graph hydration for both retired trigger types, remove the visible `addToQueue.priority_out` authoring port, rename queue-facing `Priority` language to `Priority Queue`, add an explicit `Wire trigger inputs` action for wiring `addToQueue` from an existing `enteredAttacked` trigger, and normalize queue weight values so `0` becomes `100` before restore and compilation outputs are produced.

The implementation will stay inside the existing React Flow + TypeScript frontend and deterministic compiler pipeline. The main touchpoints are the node registry and hydration path in `src/data`, toolbox filtering in `src/components/Sidebar.tsx`, drag-drop behavior in `src/components/CanvasWorkspace.tsx`, weight normalization in `src/data/nodeFieldCatalog.ts`, and compiler socket/binding updates in `src/compiler/generators` and the emitter fallback logic.

## 1.2. Technical Context

**Language/Version**: TypeScript `5.9`, React `19`, ES Modules, strict typing  
**Primary Dependencies**: `@xyflow/react`, React, Vite, Bun, Vitest, Testing Library, Playwright, `axe-core`  
**Storage**: Browser `localStorage` for saved flow graphs and UI state; no new storage backend  
**Testing**: Vitest unit/integration tests, `@testing-library/react`, Playwright workflow coverage, `axe-core` accessibility audits  
**Target Platform**: Browser-based SPA, primarily desktop canvas authoring with responsive support  
**Project Type**: Frontend web application with an embedded deterministic compiler pipeline  
**Performance Goals**: Preserve immediate drag/drop feedback, keep auto-wiring within the same authoring interaction, and avoid measurable regression in local compilation or restore workflows  
**Constraints**: Strict TypeScript with no `any`, deterministic graph-to-code output, backward-compatible saved-graph restore, accessible React Flow interactions, no new network dependency for authoring behavior  
**Scale/Scope**: Single-feature refactor spanning node catalog metadata, saved-flow hydration, canvas drop wiring, compiler bindings, and existing unit/UI test suites within one `src/` application

## 1.3. Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 1.3.1. Pre-Research Gate

- **I. Type Safety Above All**: Pass. The plan stays in strict TypeScript types already defined around `NodeDefinition`, `FlowNodeData`, and compiler node bindings.
- **II. Visual Feedback is Paramount**: Pass. Queue wiring stays in the existing canvas workflow through a node context-menu action, so the affordance remains local to the queue node without implicit graph edits on drop.
- **IV. Predictable Code Generation**: Pass. Legacy node restore remains deterministic, and queue-weight normalization is centralized before IR/code emission.
- **V. Security by Default**: Pass. No secret handling or new external content surface is introduced.
- **VI. Test-First Quality**: Pass with required follow-up. The execution plan fronts shared failing regression tests before shared implementation work, then keeps tests-first ordering inside each user story.
- **VII. Accessibility & Inclusion**: Pass with required follow-up. Toolbox and canvas interaction changes will be verified with Playwright workflow coverage plus `axe-core` accessibility assertions.
- **VIII. Durability & Maintainability**: Pass. Saved graph compatibility is preserved and logic is kept inside existing single-responsibility modules.

### 1.3.2. Post-Design Re-Check

- Phase 1 artifacts keep the same architecture boundaries: node metadata remains in `src/data`, auto-wiring remains in the React Flow workspace layer, and compiler behavior remains in generator/emitter modules.
- Task sequencing now aligns with constitution requirements by placing shared failing regressions before shared implementation and by including Playwright plus accessibility verification for changed canvas/toolbox workflows.
- No constitutional violations or ADR exceptions were introduced by the design.

## 1.4. Project Structure

### 1.4.1. Documentation

```text
specs/024-node-engine-refactor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── node-engine-refactor.md
└── tasks.md
```

### 1.4.2. Source Code

```text
src/
├── components/
│   ├── CanvasWorkspace.tsx
│   ├── Sidebar.tsx
│   └── restoreSavedFlow.ts
├── compiler/
│   ├── emitter.ts
│   └── generators/
│       ├── actions.ts
│       └── eventTriggers.ts
├── data/
│   ├── kitchenSinkFlow.ts
│   ├── node-definitions.ts
│   ├── nodeFieldCatalog.ts
│   └── nodeMigration.ts
├── types/
│   └── nodes.ts
├── utils/
│   └── socketTypes.ts
└── __tests__/
    ├── Sidebar.test.tsx
    ├── canvasFlow.test.tsx
    ├── nodeDefinitions.test.ts
    ├── nodeFieldCatalog.test.ts
    ├── restoreSavedFlow.test.ts
    ├── socketTypes.test.ts
    └── compiler/
        ├── generators/actions.test.ts
        └── irBuilder.test.ts
```

**Structure Decision**: Use the existing single-project frontend structure. This feature is entirely contained within the current `src/` tree and does not justify new packages, services, or application boundaries.

## 1.5. Phase Plan

### 1.5.1. Phase 0 Research Outcomes

- Keep legacy trigger node types in the runtime catalog and hydration path; hide them from authoring by filtering deprecated nodes from `authorableNodeDefinitions`.
- Place trigger-input wiring in the existing React Flow workspace layer behind the queue node context menu so authors opt into the helper when needed.
- Use the same socket ids, `priority` and `target`, on the new `enteredAttacked` node so saved and newly created edges stay compatible with the current queue and target-processing pipeline.
- Normalize queue weight values at the node-field normalization layer so restore, edit, IR build, and compile paths see the same canonical value.

### 1.5.2. Phase 1 Design Outcomes

- Update `NodeDefinition` usage to represent authoring visibility through the existing deprecation metadata rather than a parallel flag.
- Treat `enteredAttacked` as the current authoring trigger and `aggression`/`proximity` as legacy runtime definitions with deprecation metadata and remediation messaging where helpful.
- Define deterministic trigger-input wiring to the first compatible `enteredAttacked` node in stable node order, while skipping any already-connected compatible input (`priority_in` or `target`) and any duplicate edge tuple.
- Remove `priority_out` from `addToQueue` authoring metadata and align generator/emitter behavior so queue output weight still resolves through the action result without exposing the deprecated handle.

## 1.6. Complexity Tracking

No constitutional violations or exceptional complexity justifications are required for this design.
