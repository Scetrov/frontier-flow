# Canvas Interaction Contract

## Purpose

Defines the observable interaction contract for node chrome, edge deletion, keyboard deletion, and graph context menus for the Graph Editor QoL feature.

## 1. Node Chrome Contract

### Header Affordances

- Every node exposes an edit control and a delete control in the top-right area.
- The edit control remains minimalist: transparent background, standard text color, hover opacity change, and subtle glow.
- The delete control has two modes:
  - `idle`: delete icon only.
  - `confirm`: confirm and cancel actions replace the default delete icon.

### Delete Behavior

- Standard click on the node delete control enters `confirm` mode.
- Confirm removes the node and its connected edges.
- Cancel returns the control to `idle` mode.
- Inactivity for 15 seconds returns the control to `idle` mode.
- `Shift` + activation in `idle` mode deletes immediately without entering confirmation.

### Error Indicator Behavior

- When a node has `error` validation state, its main icon is replaced by a warning icon.
- Hovering or focusing the warning icon reveals the node's current diagnostic message content.
- When the node no longer has an error state, the standard main icon returns.

## 2. Edge Interaction Contract

- Only the currently selected edge receives a visible midpoint delete control.
- The midpoint delete control deletes that edge directly.
- If the selected edge disappears or loses selection, the midpoint delete control is removed.

## 3. Keyboard Deletion Contract

- `Delete` and `Backspace` remove the currently selected node or edge.
- Keyboard deletion is ignored while focus is inside a text-entry field, textarea, content-editable region, or other text-input control.
- If no graph element is selected, keyboard deletion performs no graph mutation.

## 4. Context Menu Contract

### Target Variants

| Target | Required Actions | Forbidden Actions |
|--------|------------------|-------------------|
| Canvas | Auto-arrange | Node delete, Edge delete |
| Node | Auto-arrange, Delete node | Edge delete |
| Edge | Delete edge | Node delete |

### Interaction Rules

- Context menus remain target-sensitive.
- Only actions valid for the current target are rendered.
- Escape or outside click closes the menu without mutating the graph.
- Action labels must clearly identify the affected target type.

## 5. Selection Feedback Contract

- Selected nodes emit a primary-brand glow.
- Selected edges emit a primary-brand glow.
- Only one selected target is in scope for this feature pass.
