# Feature Specification: Graph Editor QoL

**Feature Branch**: `009-graph-editor-qol`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Graph editor quality of life improvements for custom scrollbars, refined node edit and delete controls, selection glow, edge deletion, keyboard delete support, and toolbox category reorganization"

## Clarifications

### Session 2026-03-19

- Q: How should nodes in an error state present their status? → A: Replace the node's main icon with a warning icon and reveal the node's current error message on hover.
- Q: What additional actions should graph context menus expose? → A: Node context menus must include Delete, edge context menus must include Delete, and auto arrange must remain available.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safer Editing and Deletion (Priority: P1)

As a graph editor user, I want clear edit and delete controls on each node, delete actions in the relevant context menus, and a direct way to remove the currently selected node or edge so I can modify flows quickly without accidental destruction.

**Why this priority**: Editing and deletion are high-frequency actions in graph authoring. If these actions feel clumsy or unsafe, they slow down every session and increase the risk of mistakes.

**Independent Test**: Can be fully tested by opening an existing graph, editing a node from its inline control, deleting a node through the confirmation flow, bypassing confirmation with a power-user shortcut, deleting a node from its context menu, selecting an edge, deleting it from its context menu, and deleting the active selection with both pointer and keyboard interactions.

**Acceptance Scenarios**:

1. **Given** a node is visible on the canvas, **When** the user looks at the node header area, **Then** the node shows a minimalist edit control and a separate delete control in the top-right corner.
2. **Given** a node delete control is in its default state, **When** the user clicks it without any modifier key, **Then** the control switches into a confirmation state with explicit confirm and cancel actions.
3. **Given** a node delete control is in its confirmation state, **When** the user confirms deletion, **Then** the node is removed from the graph along with its connected relationships.
4. **Given** a node delete control is in its confirmation state, **When** the user cancels or leaves it untouched for 15 seconds, **Then** the control returns to its default delete state and the node remains unchanged.
5. **Given** a node delete control is in its default state, **When** the user activates it with `Shift` held, **Then** the node is deleted immediately without entering confirmation.
6. **Given** an edge is the active selection, **When** the user selects it, **Then** a single delete control appears at the edge midpoint.
7. **Given** a node or edge is the active selection and the graph surface is ready to receive keyboard commands, **When** the user presses `Delete` or `Backspace`, **Then** the active selection is removed.
8. **Given** a node context menu is opened, **When** the user reviews the available actions, **Then** the menu includes a Delete action for that node alongside auto arrange.
9. **Given** an edge context menu is opened, **When** the user reviews the available actions, **Then** the menu includes a Delete action for that edge.

---

### User Story 2 - Clear Focus and Navigation Cues (Priority: P2)

As a graph editor user, I want selected elements, error states, and scrollable regions to be visually obvious so I can keep track of focus, validation problems, and available content while working in dense graphs.

**Why this priority**: Focus visibility and scroll visibility directly affect usability. Users need immediate feedback about what is selected and whether more content exists beyond the current viewport.

**Independent Test**: Can be fully tested by loading content that overflows editor regions, observing the scrollbar treatment in supported browsers, selecting a node, selecting an edge, forcing a node into an error state, and verifying the new focus and error styling without exercising toolbox changes.

**Acceptance Scenarios**:

1. **Given** an editor region contains overflow content, **When** the region is rendered in a supported browser, **Then** a themed scrollbar remains visibly present for that region instead of auto-hiding.
2. **Given** a node is selected, **When** the user focuses it, **Then** the node shows a distinct glow in the primary brand color that differentiates it from unselected nodes.
3. **Given** an edge is selected, **When** the user focuses it, **Then** the edge shows a distinct glow in the primary brand color that differentiates it from unselected edges.
4. **Given** the user hovers the node edit control, **When** the pointer enters the control, **Then** the control changes opacity and shows a subtle glow that signals interactivity.
5. **Given** a node is in an error state, **When** the node is rendered, **Then** its main icon is replaced with a warning icon.
6. **Given** a node is in an error state, **When** the user hovers the warning icon, **Then** the node's current error message is shown.

---

### User Story 3 - Faster Toolbox Discovery (Priority: P3)

As a graph editor user, I want toolbox categories to reflect the way I think about available node types so I can find the right node family without scanning an overloaded accordion.

**Why this priority**: Toolbox structure affects discoverability, but it is less critical than direct editing safety and focus visibility because users can still complete work with the current grouping.

**Independent Test**: Can be fully tested by opening the toolbox, reviewing top-level accordion labels, expanding the data-related groupings, and verifying that the existing high-level categories remain while the previous overloaded data grouping is split into two clearer categories.

**Acceptance Scenarios**:

1. **Given** the toolbox is displayed, **When** the user reviews the top-level accordion labels, **Then** Event Trigger, Logic, and Action remain present.
2. **Given** the toolbox is displayed, **When** the user reviews data-related accordion labels, **Then** the previous combined Data Accessor grouping is replaced by separate Static Data and Data Extractor accordions.
3. **Given** the toolbox is displayed, **When** the user expands or collapses categories, **Then** the existing accordion interaction model remains intact.

### Edge Cases

- If a user triggers node deletion confirmation and then selects a different element, the pending confirmation remains scoped only to the original node and does not delete any newly selected element.
- If keyboard deletion is invoked while focus is inside an editable text field or other text-entry control, the deletion shortcut does not remove the selected graph element.
- If a selected edge becomes invalid or disappears before its midpoint delete control is used, the control is removed without leaving an orphaned action on screen.
- If a graph region does not overflow, no persistent scrollbar is shown for that region.
- If a user rapidly reopens and cancels deletion confirmation multiple times, the control always resolves back to a single default delete state.
- If a node leaves its error state, the warning icon is removed and the standard main icon returns without requiring a reload.
- If a node has multiple active validation messages, hovering the warning icon reveals the node's current error message set without obscuring which node is affected.
- If a context menu is opened for empty canvas space, node-only and edge-only Delete actions are not shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace default graph-editor scrollbars in overflowing regions with a themed scrollbar treatment that uses the product's primary and background color system.
- **FR-002**: The system MUST provide the themed scrollbar treatment across current Chrome/Blink, Firefox/Gecko, and Safari/WebKit browsers.
- **FR-003**: The system MUST keep themed scrollbars visibly present whenever their container has overflow content.
- **FR-004**: Each node MUST display an edit control in the top-right corner using a minimalist pencil-style icon treatment.
- **FR-005**: The node edit control MUST use a transparent visual treatment with no extra decorative padding and MUST inherit the standard node text color in its default state.
- **FR-006**: Hovering the node edit control MUST change its opacity and add a subtle glow to communicate interactivity.
- **FR-007**: Each node MUST display a delete control adjacent to the edit control in the top-right corner.
- **FR-008**: Activating a node delete control with a standard click MUST switch that control into a confirmation state that offers explicit confirm and cancel actions.
- **FR-009**: If the confirmation state is neither confirmed nor cancelled within 15 seconds, the delete control MUST revert to its default state without deleting the node.
- **FR-010**: Activating the default node delete control with `Shift` held MUST delete the node immediately without entering confirmation.
- **FR-011**: Selected nodes MUST display a distinct glow using the primary brand color.
- **FR-012**: Selected edges MUST display a distinct glow using the primary brand color.
- **FR-013**: Only the actively selected single node or edge is in scope for the glow and deletion affordances covered by this feature.
- **FR-014**: When an edge is the active selection, the system MUST show one delete control positioned at the visual midpoint of that edge.
- **FR-015**: Pressing `Delete` or `Backspace` MUST remove the currently active selected node or edge when the graph surface is the active interaction target.
- **FR-016**: Keyboard deletion MUST not remove a node or edge while the user's active focus is inside a text-entry control.
- **FR-017**: The toolbox MUST retain the existing accordion-style expand and collapse interaction.
- **FR-018**: The toolbox MUST continue to expose Event Trigger, Logic, and Action as top-level categories.
- **FR-019**: The toolbox MUST replace the previous Data Accessor top-level category with separate Static Data and Data Extractor top-level categories.
- **FR-020**: The node families currently available under the previous data-related grouping MUST remain available after the reorganization under the appropriate new category.
- **FR-021**: When a node enters an error state, the system MUST replace that node's standard main icon with a warning icon.
- **FR-022**: Hovering a node's warning icon MUST reveal the node's current error message or error message set.
- **FR-023**: Context menus opened for a node MUST include a Delete action for that node while preserving auto arrange.
- **FR-024**: Context menus opened for an edge MUST include a Delete action for that edge.

### Key Entities *(include if feature involves data)*

- **Graph Node**: A selectable canvas element representing one unit of graph logic, with inline controls for editing and deletion.
- **Graph Edge**: A selectable connection between two nodes, with a midpoint delete action shown only when it is the active selection.
- **Inline Node Controls**: The paired edit and delete actions displayed in the node header area, including the delete control's temporary confirmation state.
- **Deletion Confirmation State**: A temporary node-level state that replaces the default delete action with confirm and cancel options and automatically expires after 15 seconds.
- **Node Error Indicator**: A warning-icon replacement for the node's main icon that signals an active error state and exposes the current error message on hover.
- **Toolbox Category**: A top-level accordion grouping that organizes available node families for insertion into the graph.

## Assumptions

- This pass applies only to single-selection behavior; multi-select highlighting and bulk deletion remain out of scope.
- Keyboard deletion applies to the currently active node or edge selection and assumes the user is interacting with the graph surface rather than typing into a form field.
- The toolbox reorganization changes category labels and grouping only; it does not add new node families or remove existing graph capabilities.
- The requested scrollbar treatment applies to graph editor surfaces and related overflow containers within the editor experience, not to the host operating system outside the application.
- Existing context menus already support target-specific invocation and will remain context-sensitive after adding the new Delete actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In supported browsers, 100% of graph-editor regions that contain overflow display a visible themed scrollbar without requiring hover to reveal it.
- **SC-002**: In task-based validation, users can edit or intentionally remove a selected node in no more than 2 direct interactions for the standard flow and 1 direct interaction for the shortcut flow.
- **SC-003**: In task-based validation, at least 90% of users can correctly identify the currently selected node or edge within 1 second of selection.
- **SC-004**: In task-based validation, at least 90% of users can locate a requested data-related toolbox category on the first attempt without opening an unrelated accordion.
- **SC-005**: In task-based validation, at least 90% of users can identify that a node is in an error state and view its error message by hovering the warning icon on the first attempt.
- **SC-006**: In task-based validation, at least 90% of users can remove a node or edge from its context menu on the first attempt without invoking the wrong target action.
