# Research: Graph Editor QoL

## Decision 1: Keep graph-specific visual styling in `src/index.css` and use Tailwind only for local layout utilities

- **Decision**: Implement persistent scrollbars, selection glows, edge midpoint delete affordances, and node chrome refinements in `src/index.css`, while preserving existing Tailwind utility usage in component markup for layout and spacing.
- **Rationale**: The graph editor already centralizes React Flow selectors, CSS variables, and node/edge-specific styles in `src/index.css`. Cross-browser scrollbar rules and React Flow internal selectors are materially easier to manage there than through Tailwind utility composition alone. This also aligns with the current project convention of mixing Tailwind for layout with CSS variables and global selectors for graph visuals.
- **Alternatives considered**:
  - Express all new styling as Tailwind utility classes. Rejected because React Flow edge selectors, pseudo-elements, and browser-specific scrollbar primitives are awkward and brittle in utility-only form.
  - Move node and edge styling into component-local CSS modules. Rejected because the feature spans shared graph selectors and would fragment existing styling ownership.

## Decision 2: Keep deletion orchestration and context-menu targeting in `CanvasWorkspace`

- **Decision**: Extend `CanvasWorkspace` to own selected-target deletion, context-menu target typing, keyboard delete handling, edge midpoint delete visibility, and node delete-confirmation timers.
- **Rationale**: `CanvasWorkspace` already owns node and edge state, diagnostics mapping, and context-menu placement. Centralizing deletion logic there preserves a single source of truth for selection, avoids duplicating graph mutations in child components, and keeps keyboard and pointer deletion behavior consistent.
- **Alternatives considered**:
  - Let each node and edge component mutate graph state directly. Rejected because graph mutations would then be split across multiple render surfaces and become harder to test safely.
  - Introduce a new global state library for graph actions. Rejected because the constitution disfavors extra state layers without strong justification, and existing React Flow hooks already cover the required scope.

## Decision 3: Reuse existing diagnostic data to drive the node error indicator contract

- **Decision**: Use `validationState` and `diagnosticMessages` already attached to `FlowNodeData` to determine when the main node icon becomes a warning icon and what content is exposed on hover.
- **Rationale**: The diagnostic pipeline already groups compiler diagnostics by node and emits user-facing messages. Reusing this shape avoids a duplicate error model and guarantees that the warning indicator reflects the same validation source as the rest of the editor.
- **Alternatives considered**:
  - Build a separate tooltip data store for node errors. Rejected because it duplicates state that already exists on the node view model.
  - Show a warning icon for both warnings and errors. Rejected because the accepted clarification is specific to nodes in an error state; warning-only presentation can remain unchanged for this pass.

## Decision 4: Split the existing `data-accessor` taxonomy into `static-data` and `data-extractor` at the type and definition level

- **Decision**: Extend `NodeCategory` to include `static-data` and `data-extractor`, update the sidebar accordion order and labels accordingly, and remap affected node definitions into the new categories.
- **Rationale**: The current overloading exists in both the UI and the data model. Updating only the rendered label would leave downstream grouping semantics inconsistent. A type-level split keeps category ownership explicit, makes tests deterministic, and keeps toolbox order grounded in source data.
- **Alternatives considered**:
  - Keep `data-accessor` in the type system and alias it into two visual groups in the sidebar. Rejected because it creates an implicit mapping layer that will drift as node definitions evolve.
  - Introduce nested accordion groups under the current category. Rejected because the spec explicitly requires two new top-level accordions.

## Decision 5: Verify UX changes with Vitest interaction coverage first and reserve Playwright for browser-level confirmation

- **Decision**: Add or extend Vitest and React Testing Library coverage for node chrome, context-menu actions, keyboard deletion, and category rendering, using fake timers for the 15-second confirmation timeout. Use Playwright only if browser-level verification is needed for scrollbar rendering or end-to-end canvas interaction confidence.
- **Rationale**: The codebase already has strong canvas-focused Vitest coverage, including context-menu interaction. Most of this feature can be validated cheaply and deterministically in jsdom. The constitution still allows browser-level tests where they add confidence, especially around keyboard workflows and layout behavior.
- **Alternatives considered**:
  - Test the entire feature only with Playwright. Rejected because timeout logic and state transitions are slower and less deterministic in full-browser tests.
  - Skip browser-level validation entirely. Rejected because scrollbars and focus treatments can vary by engine and may warrant at least targeted manual or Playwright verification.
