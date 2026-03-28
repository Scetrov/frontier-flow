# Research: Visual Designer Guided Tutorial

**Feature**: `016-visual-designer-tutorial`
**Date**: 2026-03-28

## 1. Spotlight Overlay Technique

### Decision: CSS `box-shadow` spread on a clipping element

### Rationale

The spotlight effect requires dimming the entire viewport except a rectangular region around the highlighted element. Three techniques were evaluated:

| Technique | Pros | Cons |
|-----------|------|------|
| CSS `box-shadow` with large spread | Single DOM element; GPU-composited; smooth transitions via CSS; simple `getBoundingClientRect()` mapping | Only rectangular highlights (acceptable for this use case) |
| SVG clip-path with `<rect>` cutout | Supports arbitrary shapes; precise cutout | Extra SVG complexity; harder to animate between steps; path recalculation on resize |
| `mix-blend-mode` overlay | Keeps underlying element fully interactive | Colour distortion; not reliable across browsers; contrast issues with dark theme |
| Multiple overlay `<div>` panels (4 sides) | Element truly interactive (not covered) | Complex positioning; 4 elements to animate; tricky edge cases with scroll |

### Implementation

```css
.ff-tutorial__spotlight {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  /* Box-shadow with large spread creates the dim effect */
  /* The element itself is positioned/sized to match the target */
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
  transition: top 300ms ease, left 300ms ease, width 300ms ease, height 300ms ease;
}
```

The spotlight `<div>` is sized and positioned to match the target element's bounding rect (with padding). The enormous `box-shadow` spread covers everything outside that rect. The overlay container behind it captures click events (for dismiss on backdrop click, if desired).

### Alternatives Considered

SVG clip-path was the runner-up. It allows non-rectangular cutouts but adds complexity without benefit — all 5 tutorial targets are rectangular DOM elements. The `box-shadow` technique is simpler, GPU-composited, and transitions smoothly with CSS.

---

## 2. Tooltip Positioning Strategy

### Decision: Manual positioning with `getBoundingClientRect()` + viewport-aware flipping

### Rationale

The tooltip must appear adjacent to the highlighted element without overlapping it and without overflowing the viewport. Existing modals in the codebase use fixed centering (`fixed inset-0 flex items-center justify-center`), but the tutorial tooltip must be anchored to specific elements.

### Implementation

1. Read target element's `getBoundingClientRect()`.
2. Compute preferred tooltip position based on a per-step hint (`"bottom"`, `"left"`, `"right"`, `"top"`).
3. Check if the tooltip would overflow the viewport in that direction — if so, flip to the opposite side.
4. Apply a consistent padding/gap (12px) between the target rect and the tooltip edge.
5. Clamp the tooltip's position to keep it within 8px of any viewport edge.

Each tutorial step definition includes a `tooltipPosition` hint:
- Step 1 (Network Selector): `"bottom"` — selector is at top of screen
- Step 2 (Toolbox): `"left"` — toolbox is on the right side
- Step 3 (Socket): `"bottom"` — sockets are on node edges
- Step 4 (Save/Load): `"right"` — panel is on the left side
- Step 5 (View Nav): `"bottom"` — nav is in the header

### Alternatives Considered

Floating UI (`@floating-ui/dom`) was considered for automatic positioning but rejected to avoid adding a new dependency per constitution (no library unless justified via ADR). The positioning logic is straightforward (< 40 lines) and only needs to handle 5 known elements.

---

## 3. Focus Trapping

### Decision: Reuse existing `trapFocusWithinPanel` pattern from `DeploymentProgressModal`

### Rationale

The codebase already has a working focus-trap implementation used by `DeploymentProgressModal.tsx` and `LocalEnvironmentSettingsModal.tsx`. It handles Tab/Shift+Tab wrapping and `getFocusableElements()`. The tutorial tooltip has only 2 focusable elements (Next, Dismiss), making this a simple application.

### Implementation

- On step mount: focus the tooltip panel ref.
- On Tab: cycle between Next and Dismiss buttons.
- On Escape: call dismiss.
- Use `aria-modal="true"` and `role="dialog"` on the overlay container.
- Use `aria-live="polite"` on the step description for screen reader announcements.

### Alternatives Considered

A generic `useFocusTrap` hook was considered but would be over-engineering for 2 buttons. Inline focus management (as existing modals do) is simpler and consistent.

---

## 4. Demo Node Insertion for Socket Step

### Decision: Insert a temporary node via `setNodes()`, highlight its first output socket, remove on step advance/dismiss

### Rationale

When the canvas is empty, step 3 ("drag from a socket") has nothing to highlight. The spec requires placing a temporary demo node. The codebase already has `setNodes()` from `useNodesState` and `getNodeDefinition()` from `data/node-definitions.ts` — we can insert a well-known node type (e.g., `"aggression"` which has both input and output sockets).

### Implementation

1. On entering step 3, check if `nodes.length === 0`.
2. If empty, create a demo node:
   ```typescript
   const demoNode: FlowNode = {
     id: "tutorial-demo-node",
     type: "aggression",
     position: { x: 300, y: 200 },
     data: createFlowNodeData(getNodeDefinition("aggression")),
   };
   setNodes((current) => [...current, demoNode]);
   ```
3. After the node renders, query its socket handle element via `document.querySelector('[data-handleid]')` within the node's DOM.
4. Use the socket's `getBoundingClientRect()` for spotlight positioning.
5. On advancing past step 3 or dismissing the tutorial, remove the demo node:
   ```typescript
   setNodes((current) => current.filter((n) => n.id !== "tutorial-demo-node"));
   ```

### Alternatives Considered

Highlighting the socket legend in the Toolbox was considered (simpler) but rejected in the clarification session — placing a real node on the canvas creates a more impactful learning moment.

---

## 5. localStorage Key Schema

### Decision: Use `frontier-flow:tutorial` key with a versioned JSON object

### Rationale

Consistent with the existing `frontier-flow:*` key convention (`frontier-flow:ui-state`, `frontier-flow:contracts`, etc.) and the versioned state pattern (all persisted states include a `version` field).

### Implementation

```typescript
const TUTORIAL_STORAGE_KEY = "frontier-flow:tutorial";

interface TutorialPersistedState {
  readonly version: 1;
  readonly hasSeenTutorial: boolean;
}
```

Load/save follows the same `getBrowserStorage()` → `getItem` / `setItem` pattern as `uiStateStorage.ts`.

### Alternatives Considered

A simple boolean flag (`frontier-flow:tutorial-seen = "true"`) was considered but rejected for consistency — all other storage in the app uses versioned JSON objects, allowing future migration (e.g., adding `lastStepViewed` or `tutorialVersion`).

---

## 6. Z-Index Stacking

### Decision: Tutorial overlay at `z-[60]`, tooltip at `z-[61]`

### Rationale

Existing z-index stack:
- `z-20`: Mobile sidebar overlay
- `z-30`: Sidebar/right drawer
- `z-40`: Header
- `z-50`: Wallet status dropdown

The tutorial must appear above ALL existing UI (including the header at `z-40` and wallet dropdown at `z-50`) since it needs to dim everything and then selectively spotlight elements. `z-60` ensures the overlay is above all existing layers. The tooltip at `z-61` sits above the spotlight.

The highlighted target element gets `position: relative; z-index: 60` applied temporarily via a CSS class (`ff-tutorial__target`) so it "punches through" the overlay at the same layer.

---

## 7. Animation & Transition Approach

### Decision: CSS transitions (300ms ease) for spotlight movement; no JavaScript animation library

### Rationale

The spotlight `<div>` moves between elements by updating its `top`, `left`, `width`, `height` CSS properties. CSS transitions handle the interpolation smoothly at 60fps with GPU compositing. This avoids adding `framer-motion` or any animation library.

### Implementation

```css
.ff-tutorial__spotlight {
  transition: top 300ms ease, left 300ms ease, width 300ms ease, height 300ms ease;
}

.ff-tutorial__tooltip {
  transition: opacity 200ms ease, transform 200ms ease;
}
```

Step transitions:
1. Update spotlight position → CSS transition animates movement.
2. Fade tooltip out (opacity 0) → update tooltip content + position → fade in (opacity 1).

### Alternatives Considered

`requestAnimationFrame` loop was considered for smoother control but CSS transitions are simpler and sufficient for the 300ms movement between 5 fixed positions.
