# Data Model: Visual Designer Guided Tutorial

**Feature**: `016-visual-designer-tutorial`
**Date**: 2026-03-28

## 1. Entities

### 1.1. `TutorialStepId`

Discriminated union identifying each tutorial step.

```text
"network-selector" | "toolbox" | "socket" | "save-load" | "view-navigation"
```

### 1.2. `TutorialStepDefinition`

Static configuration for a single tutorial step. Immutable; defined at module scope.

| Field                | Type                                     | Description                                                   |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `id`                 | `TutorialStepId`                         | Unique step identifier                                        |
| `ordinal`            | `number` (1–5)                           | Display order                                                 |
| `message`            | `string`                                 | Tooltip description text                                      |
| `tooltipPosition`    | `"top" \| "bottom" \| "left" \| "right"` | Preferred tooltip placement relative to target                |
| `resolveTarget`      | `() => HTMLElement \| null`              | Function that locates the DOM element to highlight            |
| `requiresDrawerOpen` | `"sidebar" \| "contract-panel" \| null`  | If set, the named drawer must be expanded before highlighting |
| `requiresDemoNode`   | `boolean`                                | If `true`, insert a temporary demo node when canvas is empty  |

### 1.3. `TutorialState`

Runtime state for the active tutorial session. Managed by the `useTutorial` hook.

| Field              | Type              | Description                                             |
| ------------------ | ----------------- | ------------------------------------------------------- |
| `isActive`         | `boolean`         | Whether the tutorial overlay is currently displayed     |
| `currentStepIndex` | `number` (0–4)    | Index into the ordered step array                       |
| `targetRect`       | `DOMRect \| null` | Bounding rectangle of the currently highlighted element |

> **Note**: Tooltip fade-in/out visibility is managed as component-internal state within `TutorialOverlay`, not in the hook-level `TutorialState`. See research §7.2 for transition timing (200ms ease).

### 1.4. `TutorialPersistedState`

Persisted to `localStorage` under key `frontier-flow:tutorial`.

| Field             | Type          | Description                                              |
| ----------------- | ------------- | -------------------------------------------------------- |
| `version`         | `1` (literal) | Schema version for future migration                      |
| `hasSeenTutorial` | `boolean`     | Whether the user has completed or dismissed the tutorial |

## 2. State Transitions

```text
                    ┌─────────────────────┐
                    │      INACTIVE        │
                    │  isActive = false     │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │ First visit    │                 │ Manual trigger
              │ (auto-start)  │                 │ (help button)
              ▼                ▼                 ▼
        ┌─────────────────────────────────────────┐
        │              STEP N ACTIVE               │
        │  isActive = true                         │
        │  currentStepIndex = N                    │
        │  targetRect = measured rect              │
        └──────┬──────────────┬───────────────────┘
               │              │
     ┌─────────┘              └──────────┐
     │ "Next" click                      │ "Dismiss" / Escape /
     │ (N < 4)                           │ View change / "Finish"
     ▼                                   ▼
┌──────────────┐              ┌────────────────────┐
│ TRANSITIONING│              │     DISMISSED       │
│ tooltipVisible│              │ isActive = false    │
│   = false    │              │ persist hasSeenTrue │
│ measure next │              └────────────────────┘
│ target rect  │
└──────┬───────┘
       │ rect measured
       ▼
┌──────────────┐
│ STEP N+1     │
│ ACTIVE       │
└──────────────┘
```

### Transition Rules

| Trigger                                  | From            | To                              | Side Effects                                                                                |
| ---------------------------------------- | --------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| First visit + canvas ready + 500ms delay | INACTIVE        | STEP 0 ACTIVE                   | Persist `hasSeenTutorial = true`; expand required drawers; insert demo node if needed       |
| Click help button                        | INACTIVE        | STEP 0 ACTIVE                   | Persist `hasSeenTutorial = true`; expand required drawers; insert demo node if needed       |
| Click "Next" (step < 4)                  | STEP N ACTIVE   | TRANSITIONING → STEP N+1 ACTIVE | Clean up demo node from step 3 (index 2) if advancing past it; expand drawers for next step |
| Click "Next" on step 4 (last)            | STEP 4 ACTIVE   | DISMISSED                       | Persist `hasSeenTutorial = true`; clean up demo node if present                             |
| Click "Dismiss"                          | Any ACTIVE step | DISMISSED                       | Persist `hasSeenTutorial = true`; clean up demo node if present                             |
| Press Escape                             | Any ACTIVE step | DISMISSED                       | Same as Dismiss                                                                             |
| Navigate away from Visual view           | Any ACTIVE step | DISMISSED                       | Same as Dismiss                                                                             |
| Window resize / scroll                   | Any ACTIVE step | Same step (rect updated)        | Recalculate `targetRect`                                                                    |

## 3. Relationships

```text
TutorialStepDefinition[5] ──(ordinal order)──▶ TutorialState.currentStepIndex
                                                     │
TutorialState ──(persist on start/dismiss/finish)──▶ TutorialPersistedState (localStorage)
                                                     │
TutorialPersistedState ──(read on mount)──▶ auto-start decision (if !hasSeenTutorial)
```

## 4. Validation Rules

- `currentStepIndex` MUST be in range `[0, TUTORIAL_STEPS.length - 1]`.
- `resolveTarget()` may return `null` if the DOM element is not yet mounted; the tutorial MUST wait/retry (up to 3 attempts with 100ms delay) before falling back to skipping the step.
- `TutorialPersistedState.version` MUST equal `1`; if the stored value has an unrecognised version, reset to defaults (`hasSeenTutorial: false`).
- Demo node ID MUST be a constant (`"tutorial-demo-node"`) so cleanup is deterministic.
