# Component Contracts: Visual Designer Guided Tutorial

**Feature**: `016-visual-designer-tutorial`
**Date**: 2026-03-28

## 1. `useTutorial` Hook Contract

### Input (Parameters)

```typescript
interface UseTutorialOptions {
  /** Whether the Visual Designer canvas has finished rendering */
  readonly isCanvasReady: boolean;
  /** Callback to expand a drawer before highlighting it */
  readonly onExpandDrawer: (drawer: "sidebar" | "contract-panel") => void;
  /** Callback to insert a temporary demo node on the canvas */
  readonly onInsertDemoNode: () => void;
  /** Callback to remove the temporary demo node */
  readonly onRemoveDemoNode: () => void;
  /** Current view — tutorial dismisses if not "visual" */
  readonly activeView: PrimaryView;
}
```

### Output (Return Value)

```typescript
interface UseTutorialReturn {
  /** Whether the tutorial overlay is currently displayed */
  readonly isActive: boolean;
  /** The current step definition, or null if tutorial is inactive */
  readonly currentStep: TutorialStepDefinition | null;
  /** Zero-based index of the current step */
  readonly currentStepIndex: number;
  /** Total number of tutorial steps */
  readonly totalSteps: number;
  /** Bounding rect of the highlighted element, or null if not yet measured */
  readonly targetRect: DOMRect | null;
  /** Advance to the next step, or finish if on the last step */
  readonly next: () => void;
  /** Dismiss the tutorial immediately */
  readonly dismiss: () => void;
  /** Start (or restart) the tutorial from step 0 */
  readonly start: () => void;
}
```

---

## 2. `TutorialOverlay` Component Contract

### Props

```typescript
interface TutorialOverlayProps {
  /** Whether the overlay is visible */
  readonly isActive: boolean;
  /** Current step definition */
  readonly currentStep: TutorialStepDefinition | null;
  /** Zero-based index of the current step */
  readonly currentStepIndex: number;
  /** Total number of steps */
  readonly totalSteps: number;
  /** Bounding rect of the target element for spotlight positioning */
  readonly targetRect: DOMRect | null;
  /** Callback when user clicks Next (or Finish on last step) */
  readonly onNext: () => void;
  /** Callback when user clicks Dismiss or presses Escape */
  readonly onDismiss: () => void;
}
```

### Rendering Contract

When `isActive` is `true` and `targetRect` is not `null`:

- Renders a fixed overlay at `z-60` covering the entire viewport
- Renders a spotlight `<div>` at the `targetRect` position with `box-shadow` dimming
- Renders a tooltip card at `z-61` adjacent to the spotlight, containing:
  - Step message (`currentStep.message`)
  - Progress indicator (`"Step {currentStepIndex + 1} of {totalSteps}"`)
  - "Next" button (or "Finish" on last step)
  - "Dismiss" button
- Traps focus within the tooltip (Tab cycles between Next and Dismiss)
- Calls `onDismiss` when Escape is pressed

When `isActive` is `false`: renders nothing (`null`).

---

## 3. `TutorialStepDefinition` Data Contract

### Shape

```typescript
interface TutorialStepDefinition {
  readonly id: TutorialStepId;
  readonly ordinal: number;
  readonly message: string;
  readonly tooltipPosition: "top" | "bottom" | "left" | "right";
  readonly resolveTarget: () => HTMLElement | null;
  readonly requiresDrawerOpen: "sidebar" | "contract-panel" | null;
  readonly requiresDemoNode: boolean;
}
```

### Step Configuration

| Ordinal | ID                   | Target Resolution                                                | Drawer             | Demo Node | Tooltip Pos |
| ------- | -------------------- | ---------------------------------------------------------------- | ------------------ | --------- | ----------- |
| 1       | `"network-selector"` | `document.querySelector('[aria-label="Target network/server"]')` | `null`             | `false`   | `"bottom"`  |
| 2       | `"toolbox"`          | `document.getElementById("node-toolbox")`                        | `"sidebar"`        | `false`   | `"left"`    |
| 3       | `"socket"`           | `document.querySelector('.ff-node__socket')`                     | `null`             | `true`    | `"bottom"`  |
| 4       | `"save-load"`        | `document.getElementById("saved-contract-controls")`             | `"contract-panel"` | `false`   | `"right"`   |
| 5       | `"view-navigation"`  | `document.querySelector('.ff-header__nav')`                      | `null`             | `false`   | `"bottom"`  |

---

## 4. localStorage Contract

### Key

`"frontier-flow:tutorial"`

### Schema (version 1)

```json
{
  "version": 1,
  "hasSeenTutorial": true
}
```

### Behaviour

- **Read on mount**: If key absent or unparseable → default `{ version: 1, hasSeenTutorial: false }`.
- **Write on dismiss/finish**: Set `hasSeenTutorial: true`.
- **Version mismatch**: If `version !== 1` → reset to defaults.

---

## 5. Header Help Button Contract

### Placement

Inside `HeaderActions` in `Header.tsx`, before the `WalletStatus` component.

### Element

```html
<button
  type="button"
  class="ff-header__help-button"
  aria-label="Start tutorial"
  title="Start tutorial"
>
  ?
</button>
```

### Callback

Receives `onStartTutorial?: () => void` as a new prop on `HeaderProps`. When clicked, calls `onStartTutorial()`.
