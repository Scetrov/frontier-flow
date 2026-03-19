# Data Model: Graph Editor QoL

## 1. Canvas Selection

- **Purpose**: Represents the single active graph element, if any.
- **Fields**:
  - `kind`: `none | node | edge`
  - `targetId`: string | null
  - `origin`: `pointer | keyboard | programmatic`
- **Relationships**:
  - Drives edge midpoint delete visibility.
  - Drives keyboard deletion eligibility.
  - Drives selected-state glow for nodes and edges.
- **Validation Rules**:
  - At most one node or edge may be selected for this feature pass.
  - `targetId` must be null when `kind` is `none`.
- **State Transitions**:
  - `none -> node`
  - `none -> edge`
  - `node -> none`
  - `edge -> none`
  - `node -> edge` and `edge -> node` by replacing the current selection.

## 2. Node Action State

- **Purpose**: Controls inline node affordances and the delete confirmation lifecycle.
- **Fields**:
  - `nodeId`: string
  - `deleteMode`: `idle | confirm`
  - `confirmationStartedAt`: number | null
  - `supportsImmediateDelete`: boolean
- **Relationships**:
  - Bound to a single `Graph Node`.
  - Consumed by node chrome rendering in `BaseNode`.
- **Validation Rules**:
  - Only one confirmation state may be active per node.
  - `confirmationStartedAt` is required when `deleteMode` is `confirm`.
- **State Transitions**:
  - `idle -> confirm` on standard delete activation.
  - `confirm -> idle` on cancel.
  - `confirm -> idle` on timeout expiry.
  - `idle -> deleted` on `Shift` + delete activation.
  - `confirm -> deleted` on confirmation.

## 3. Node Diagnostic Presentation

- **Purpose**: Encodes how existing diagnostics are exposed in node chrome.
- **Fields**:
  - `nodeId`: string
  - `severity`: `warning | error | none`
  - `messages`: readonly string[]
  - `iconVariant`: `default | warning`
- **Relationships**:
  - Derived from compiler diagnostics grouped by node.
  - `iconVariant` influences the main node icon shown in `BaseNode`.
- **Validation Rules**:
  - `iconVariant` becomes `warning` only when `severity` is `error`.
  - `messages` must remain plain text suitable for safe React rendering.
- **State Transitions**:
  - `default -> warning` when an error diagnostic targets the node.
  - `warning -> default` when error diagnostics clear.
  - Message content may change while the node remains in the same severity state.

## 4. Context Menu Target

- **Purpose**: Determines which context menu actions are visible and which graph target they act on.
- **Fields**:
  - `kind`: `canvas | node | edge`
  - `targetId`: string | null
  - `positionX`: number
  - `positionY`: number
- **Relationships**:
  - `canvas` target exposes auto-arrange.
  - `node` target exposes node delete plus shared canvas actions retained for node scope.
  - `edge` target exposes edge delete.
- **Validation Rules**:
  - `targetId` is required for `node` and `edge` targets.
  - Only actions valid for the active target kind are displayed.
- **State Transitions**:
  - `closed -> canvas`
  - `closed -> node`
  - `closed -> edge`
  - `any target -> closed` on escape, outside click, or action completion.

## 5. Edge Delete Anchor

- **Purpose**: Represents the visible midpoint delete affordance for a selected edge.
- **Fields**:
  - `edgeId`: string
  - `visible`: boolean
  - `midpointX`: number
  - `midpointY`: number
- **Relationships**:
  - Derived from the currently selected edge geometry.
  - Hidden when the edge is not selected or no longer exists.
- **Validation Rules**:
  - Only one anchor is visible at a time in this feature scope.
  - Coordinates must be recomputed when edge geometry changes.
- **State Transitions**:
  - `hidden -> visible` when an edge becomes selected.
  - `visible -> hidden` when selection changes or the edge is deleted.

## 6. Toolbox Category Mapping

- **Purpose**: Defines top-level accordion grouping for insertable node families.
- **Fields**:
  - `categoryId`: `event-trigger | static-data | data-extractor | logic-gate | action`
  - `label`: string
  - `nodeTypeIds`: readonly string[]
  - `collapsedByDefault`: boolean
- **Relationships**:
  - Drives rendering order and labels in `Sidebar`.
  - References node definitions in `src/data/node-definitions.ts`.
- **Validation Rules**:
  - Each node definition belongs to exactly one top-level category.
  - The legacy `data-accessor` grouping must not remain user-visible after the split.
- **State Transitions**:
  - Category membership is static at runtime for this feature.
  - Accordion open/closed state remains independent from category identity.
