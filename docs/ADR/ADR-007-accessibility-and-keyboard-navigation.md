# ADR 7: Accessibility and Keyboard Navigation

## Context

Frontier Flow is a highly visual, node-based editor. While the mouse-driven interface is intuitive for many, it currently lacks the structural semantics and keyboard-driven workflows necessary for users who rely on screen readers or keyboard-only navigation. Furthermore, power users frequently benefit from keyboard shortcuts to accelerate repetitive tasks (e.g., node navigation, deletion, and searching).

Without a formal commitment to accessibility (a11y), the application risks excluding a segment of the developer community and falling behind modern web usability standards (WCAG).

## Decision

We will adopt a "Keyboard-First" accessibility strategy, targeting **WCAG 2.1 Level AA** compliance. This involves the following implementations:

1. **Keyboard Navigation System:**
   - **Focus Management:** Logical `Tab` order between the Header, Sidebar, Canvas, and Modals.
   - **Canvas Navigation:** Arrow keys to move focus between nodes on the canvas; `Enter` to "click" or open node details; `Delete` or `Backspace` to remove focused elements.
   - **Global Shortcuts:** `Ctrl/Cmd + /` to toggle a help overlay of shortcuts; `Ctrl/Cmd + S` to save to GitHub; `Ctrl/Cmd + P` for code preview.

2. **Structural Semantics & ARIA:**
   - Use semantic HTML elements (e.g., `<button>`, `<nav>`, `<main>`) instead of generic `<div>` wrappers for interactive elements.
   - Implement ARIA roles and labels for custom React Flow nodes and sockets (e.g., `role="region"` for nodes, `aria-label` describing socket types and connection status).
   - Utilize `aria-live` regions for the toast notification system to ensure real-time feedback (like compilation status) is announced by screen readers.

3. **Automated Enforcement:**
   - Integrate `eslint-plugin-jsx-a11y` (as specified in [ADR-006](./ADR-006-eslint-10-migration.md)) to catch a11y regressions in JSX.
   - Incorporate `axe-core` into Playwright E2E tests to automatically audit the canvas and UI components during the CI pipeline.

4. **Visual Indicators:**
   - Ensure all focusable elements have a high-contrast `:focus-visible` ring that aligns with the "sci-fi industrial" aesthetic (e.g., a `var(--brand-orange)` glow).

## Status

Accepted.

## Consequences

- **Development Overhead:** Implementing robust focus management and ARIA descriptions requires additional effort during component development and testing.
- **Improved UX:** Power users will experience significant productivity gains through keyboard shortcuts.
- **Code Quality:** Prioritizing accessibility often leads to cleaner, more semantic DOM structures and better separation of concerns.
- **Complexity:** Managing focus within the React Flow canvas (where nodes are positioned absolutely) is technically challenging and requires careful synchronization with the library's internal state.
