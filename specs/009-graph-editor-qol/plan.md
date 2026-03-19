# Implementation Plan: Graph Editor QoL

**Branch**: `009-graph-editor-qol` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-graph-editor-qol/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement graph-editor quality-of-life improvements inside the existing React Flow canvas stack by keeping canvas orchestration in `CanvasWorkspace`, node chrome in `BaseNode`, and taxonomy changes in `Sidebar` plus `node-definitions`. Because the project is built with Tailwind CSS 4 but already relies on `src/index.css` and CSS variables for graph-specific styling, the plan keeps layout-level utility classes in components while placing scrollbars, selected-state glows, edge midpoint affordances, and node warning-icon chrome in the global graph stylesheet where React Flow selectors and cross-browser scrollbar rules are easier to maintain.

## Technical Context

**Language/Version**: TypeScript 5.9.3, React 19.2.0, ES Modules  
**Primary Dependencies**: `@xyflow/react` 12.10, `lucide-react` 0.577, `dagre` 0.8.5, Tailwind CSS 4.1.18, Vite/Rolldown, CSS variables in `src/index.css`  
**Storage**: Existing browser persistence only via current contract/local storage flows; no new persistent storage required  
**Testing**: Vitest 4.1 + React Testing Library + jsdom for component and canvas interaction tests; Playwright 1.58 for browser workflow verification when needed; fake timers for confirmation timeout behavior  
**Target Platform**: Modern desktop browsers using Chrome/Blink, Firefox/Gecko, and Safari/WebKit  
**Project Type**: Single-project web application  
**Performance Goals**: Preserve immediate visual feedback for hover, selection, context-menu open/close, and delete-confirmation state changes; avoid regressions to existing canvas interaction responsiveness and compile debounce behavior  
**Constraints**: Strict TypeScript with no `any`; single-select only; keyboard deletion must not fire inside text-entry controls; UI changes must preserve sharp-edged design language, CSS-variable theming, and WCAG 2.1 AA-aligned focus affordances; tests must avoid timing assertions by using fake timers or injected control  
**Scale/Scope**: One existing frontend application; primary impact across `CanvasWorkspace`, `BaseNode`, `Sidebar`, `node-definitions`, shared node types, global graph CSS, and targeted UI test suites

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

- **Type Safety Above All**: Pass. The design extends existing discriminated data and union types for node categories, selection targets, and context menu variants without introducing untyped state.
- **Visual Feedback is Paramount**: Pass. The feature is explicitly about immediate visual feedback for selection, deletion, hover affordances, diagnostics, and overflow visibility.
- **Security by Default**: Pass with constraint. Diagnostic text must continue to render as plain React text and not introduce unsafe HTML rendering.
- **Test-First Quality**: Pass with required follow-through. The implementation must add UI interaction coverage for timeout confirmation, keyboard deletion, context-menu targeting, and error-state presentation, using fake timers instead of wall-clock waits.
- **Accessibility & Inclusion**: Pass with required follow-through. Keyboard deletion is in-scope; warning and delete affordances must remain focusable and have accessible names or equivalent descriptive text.

### Post-Design Re-Check

- **Type Safety Above All**: Pass. `NodeCategory`, context-menu target shape, delete-confirmation state, and diagnostic presentation can be represented with explicit TypeScript unions and readonly view models.
- **Visual Feedback is Paramount**: Pass. The design routes visual behavior through existing node and edge styling hooks in `src/index.css`, preserving immediate feedback on the canvas.
- **Security by Default**: Pass. Tooltip and menu content remain plain text sourced from existing `diagnosticMessages` and action labels.
- **Test-First Quality**: Pass. Design includes Vitest coverage for node chrome, canvas context menus, keyboard deletion, and category reorganization, with optional Playwright validation for browser-level flows.
- **Accessibility & Inclusion**: Pass. Design requires keyboard-triggered deletion, focus-visible affordances, and non-destructive behavior while text-entry elements hold focus.

## Project Structure

### Documentation (this feature)

```text
specs/009-graph-editor-qol/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── canvas-interactions.md
│   └── toolbox-taxonomy.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── CanvasWorkspace.tsx
│   └── Sidebar.tsx
├── compiler/
│   └── types.ts
├── data/
│   └── node-definitions.ts
├── nodes/
│   └── BaseNode.tsx
├── types/
│   └── nodes.ts
├── __tests__/
│   ├── BaseNode.test.tsx
│   ├── Sidebar.test.tsx
│   └── canvasFlow.test.tsx
└── index.css
```

**Structure Decision**: Use the existing single-project frontend structure. Canvas orchestration remains in [components/CanvasWorkspace.tsx](./../../src/components/CanvasWorkspace.tsx), node-level affordances remain in [nodes/BaseNode.tsx](./../../src/nodes/BaseNode.tsx), taxonomy changes live in [components/Sidebar.tsx](./../../src/components/Sidebar.tsx), [data/node-definitions.ts](./../../src/data/node-definitions.ts), and [types/nodes.ts](./../../src/types/nodes.ts), and graph-specific styling remains centralized in [index.css](./../../src/index.css) with Tailwind utilities left in place for component layout.

## Complexity Tracking

No constitution violations are anticipated for this design. This section remains empty by design.

