# Quickstart: Visual Designer Guided Tutorial

**Feature**: `016-visual-designer-tutorial`
**Date**: 2026-03-28

## Overview

This feature adds a 5-step guided tutorial overlay to the Visual Designer. It highlights key UI areas one at a time with a dimmed background, a spotlight cutout, and a tooltip card with Next/Dismiss controls.

## Key Files

| File                                 | Purpose                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/types/tutorial.ts`              | Type definitions (`TutorialStepId`, `TutorialStepDefinition`, `TutorialState`, `TutorialPersistedState`) |
| `src/utils/tutorialSteps.ts`         | Step definitions array with element resolvers and tooltip position hints                                 |
| `src/hooks/useTutorial.ts`           | State machine hook — manages current step, persistence, auto-start, drawer expansion, demo node          |
| `src/components/TutorialOverlay.tsx` | Spotlight overlay + tooltip card + focus trapping + keyboard navigation                                  |
| `src/components/Header.tsx`          | Modified — adds a "?" help button to restart the tutorial                                                |
| `src/App.tsx`                        | Modified — mounts `<TutorialOverlay />` and wires `useTutorial`                                          |
| `src/index.css`                      | Modified — adds `ff-tutorial__*` CSS classes                                                             |

## Architecture

```text
App.tsx
  └── useTutorial() hook
        ├── reads localStorage ("frontier-flow:tutorial")
        ├── manages step index + active state
        ├── calls onExpandDrawer / onInsertDemoNode callbacks
        └── exposes { isActive, currentStep, targetRect, next, dismiss, start }
              │
              ▼
        TutorialOverlay (rendered when isActive)
              ├── Spotlight <div> (box-shadow technique, z-60)
              ├── Tooltip card (z-61, positioned near target)
              │     ├── Step message
              │     ├── Progress indicator ("Step N of 5")
              │     ├── Next / Finish button
              │     └── Dismiss button
              └── Focus trap (Tab cycles between Next + Dismiss)

Header.tsx
  └── Help button ("?") → calls tutorial.start()
```

## How to Test

### Unit Tests

```bash
bun run test:run -- --grep tutorial
```

### E2E Tests

```bash
bun run test:e2e -- --grep tutorial
```

### Manual Testing

1. Clear localStorage: `localStorage.removeItem("frontier-flow:tutorial")`
2. Reload the page — tutorial should auto-start after ~500ms
3. Click "Next" through all 5 steps
4. Verify each element is highlighted with correct message
5. Reload — tutorial should NOT auto-start
6. Click the "?" button in the header — tutorial restarts

### Accessibility Testing

1. Start the tutorial
2. Press Tab — focus should cycle between Next and Dismiss
3. Press Enter on Next — should advance
4. Press Escape — should dismiss
5. Run axe DevTools on the page during tutorial — zero violations expected

## Design Decisions

See [`research.md`](research.md) for detailed rationale on:

- Spotlight technique (CSS `box-shadow` spread)
- Tooltip positioning (manual `getBoundingClientRect()` + flip)
- Focus trapping (reuse existing `trapFocusWithinPanel` pattern)
- Demo node insertion for socket step
- Z-index stacking (`z-60` overlay, `z-61` tooltip)
- Animation (CSS transitions, 300ms ease)
