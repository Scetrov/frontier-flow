# 1. Implementation Plan: Visual Designer Guided Tutorial

**Branch**: `016-visual-designer-tutorial` | **Date**: 2026-03-28 | **Spec**: [`spec.md`](spec.md)
**Input**: Feature specification from `specs/016-visual-designer-tutorial/spec.md`

## 1.1. Summary

A 5-step guided tutorial overlay for the Visual Designer that highlights key UI areas (network selector, toolbox, sockets, save/load, view navigation) one at a time, dimming the rest of the screen. Built as a pure TypeScript + HTML + CSS feature within the existing React component architecture — no third-party tour library — using a custom `useTutorial` hook for state, a `TutorialOverlay` component for the spotlight and tooltip rendering, and `localStorage` for persistence.

## 1.2. Technical Context

**Language/Version**: TypeScript 5.9 (strict, no `any`), ES Modules, HTML, CSS
**Primary Dependencies**: React 19, `@xyflow/react` (React Flow v12), Tailwind CSS 4
**Storage**: `localStorage` via existing `getBrowserStorage()` pattern (`frontier-flow:tutorial` key)
**Testing**: Vitest, `@testing-library/react`, Playwright (`axe-core` for a11y audits)
**Target Platform**: Modern browsers (desktop/mobile), single-page web application
**Project Type**: Web application (Vite + React SPA)
**Performance Goals**: Overlay renders in < 16 ms per step transition (no jank), animation at 60fps
**Constraints**: Zero external tour/walkthrough libraries; must use existing design system; no `border-radius`; WCAG 2.1 AA compliance
**Scale/Scope**: 5 tutorial steps, ~8 source files (4 new, 4 modified), ~3 new test files

## 1.3. Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                     | Status  | Notes                                                                                                           |
| --------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| I. Type Safety Above All                      | ✅ PASS | All tutorial types use discriminated unions and readonly props. No `any`.                                       |
| II. Visual Feedback is Paramount              | ✅ PASS | Smooth transitions between steps; spotlight + dim overlay provides clear visual feedback.                       |
| III. Domain-Driven Design                     | ✅ PASS | Tutorial steps reference domain concepts (nodes, sockets, flows).                                               |
| IV. Predictable Code Generation               | N/A     | Tutorial does not affect code generation pipeline.                                                              |
| V. Security by Default                        | ✅ PASS | Tutorial messages are hardcoded string literals; no user input rendered unsanitised.                            |
| VI. Test-First Quality                        | ✅ PASS | Unit tests for hook + overlay + positioning logic. Playwright E2E for full walkthrough.                         |
| VII. Accessibility & Inclusion                | ✅ PASS | Keyboard nav (Tab/Enter/Escape), focus trapping, ARIA live region for step announcements, WCAG 2.1 AA contrast. |
| VIII. Durability & Maintainability            | ✅ PASS | State persisted to `localStorage` via existing patterns. Single-responsibility modules.                         |
| IX. Artifact Integrity & Lifecycle Separation | N/A     | Tutorial does not affect compilation or deployment artifacts.                                                   |
| Architecture Standards — Styling              | ✅ PASS | Tailwind + CSS variables, `ff-tutorial__*` BEM classes, `border-radius: 0`.                                     |
| Architecture Standards — State                | ✅ PASS | Local React hooks + localStorage. No global state library.                                                      |
| Architecture Standards — Performance          | ✅ PASS | Lightweight overlay; `getBoundingClientRect()` reads batched; CSS transitions for animation.                    |
| Dev Workflow — Naming                         | ✅ PASS | `PascalCase` components, `camelCase` hooks/utils, `ff-tutorial` BEM prefix.                                     |
| Formatting Standards                          | ✅ PASS | Prettier + numbered headings in docs.                                                                           |

**Gate result**: ALL PASS — no violations, no Complexity Tracking needed.

## 1.4. Project Structure

### 1.4.1. Documentation (this feature)

```text
specs/016-visual-designer-tutorial/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### 1.4.2. Source Code (repository root)

```text
src/
├── components/
│   ├── Header.tsx                  # MODIFIED — add tutorial help button
│   ├── TutorialOverlay.tsx         # NEW — overlay + spotlight + tooltip
│   └── CanvasWorkspace.tsx         # MODIFIED — wire tutorial demo node logic
├── hooks/
│   └── useTutorial.ts              # NEW — tutorial state machine + localStorage
├── utils/
│   └── tutorialSteps.ts            # NEW — step definitions + element resolvers
├── types/
│   └── tutorial.ts                 # NEW — TutorialStep, TutorialState types
├── index.css                       # MODIFIED — add ff-tutorial CSS
└── App.tsx                         # MODIFIED — mount TutorialOverlay

src/__tests__/
├── useTutorial.test.ts             # NEW — hook state transitions + persistence
├── TutorialOverlay.test.tsx        # NEW — rendering, keyboard nav, a11y
└── tutorialSteps.test.ts           # NEW — step config + element resolution

tests/e2e/
└── tutorial.spec.ts                # NEW — full Playwright walkthrough + axe a11y
```

**Structure Decision**: Tutorial is a cross-cutting UI concern that touches Header (help button), CanvasWorkspace (demo node), and App (overlay mount point). New components live alongside existing components in `src/components/`. The hook, types, and step configuration are in their respective established directories.

## 1.5. Phase 0 Output Reference

See [`research.md`](research.md) for:

- Spotlight overlay technique decision (CSS `box-shadow` vs SVG clip-path vs `mix-blend-mode`)
- Tooltip positioning strategy
- Focus trapping approach
- Demo node insertion/cleanup
- `localStorage` key schema

## 1.6. Phase 1 Output Reference

See [`data-model.md`](data-model.md) for entity definitions and state transitions.
See [`quickstart.md`](quickstart.md) for developer onboarding to this feature.
