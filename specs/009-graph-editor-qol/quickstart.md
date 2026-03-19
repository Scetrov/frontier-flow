# Quickstart: Graph Editor QoL

## Goal

Implement the Graph Editor QoL feature in the existing Tailwind-based frontend while preserving the current React Flow architecture and CSS-variable-driven graph styling.

## Implementation Sequence

1. Update the graph taxonomy types.
   - Extend `NodeCategory` in `src/types/nodes.ts` with `static-data` and `data-extractor`.
   - Reassign affected definitions in `src/data/node-definitions.ts`.

2. Update the toolbox rendering.
   - Replace the old `data-accessor` accordion in `src/components/Sidebar.tsx` with `Static Data` and `Data Extractor`.
   - Keep the existing Tailwind layout classes and accordion interaction model.

3. Extend canvas interaction state.
   - In `src/components/CanvasWorkspace.tsx`, model target-specific context menus for canvas, node, and edge targets.
   - Add delete handlers for selected nodes and edges.
   - Guard keyboard deletion when focus is in a text-entry control.
   - Use fake-timer-friendly timeout handling for node delete confirmation.

4. Refine node chrome.
   - In `src/nodes/BaseNode.tsx`, replace the main icon with a warning icon when `validationState === "error"`.
   - Surface current diagnostic text on hover/focus.
   - Add the delete control beside the existing pencil edit control.

5. Add graph-specific styling.
   - Keep Tailwind for component layout.
   - Put persistent scrollbar styles, node glow, edge midpoint affordance, and node warning-icon chrome in `src/index.css` using existing CSS variables.
   - Preserve the project rule of zero border radius.

6. Add tests before or alongside implementation.
   - Extend `src/__tests__/BaseNode.test.tsx` for warning icon and hover text.
   - Extend `src/__tests__/canvasFlow.test.tsx` for context menus, keyboard deletion, midpoint delete, and delete timeout.
   - Extend `src/__tests__/Sidebar.test.tsx` for the taxonomy split.

## Validation Commands

```bash
bun run lint
bun run typecheck
bun run test:run
```

## Optional Browser Verification

Use this when validating cross-browser or canvas-level behavior beyond jsdom coverage:

```bash
bun run test:e2e
```

## Tailwind Guidance

- Use Tailwind utilities for local layout and spacing changes inside React components.
- Prefer `src/index.css` for React Flow selectors, pseudo-elements, global node/edge classes, and browser-specific scrollbar styling.
- Continue using CSS variables for theme colors rather than hard-coded utility colors where graph visuals need to match the design system.