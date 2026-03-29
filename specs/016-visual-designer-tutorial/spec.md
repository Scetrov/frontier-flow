# 1. Feature Specification: Visual Designer Guided Tutorial

**Feature Branch**: `016-visual-designer-tutorial`
**Created**: 2026-03-28
**Status**: Draft
**Input**: User description: "I would like to make a tutorial for the Visual Designer that highlights the key areas for people to get started. For each one I want the rest of the screen to be dimmed except the element, there should be a next button to move to the next element and a dismiss to dismiss the entire tutorial."

## 1.1. Clarifications

### 1.1.1. Session 2026-03-28

- Q: How should step 3 (socket highlighting) behave when no nodes exist on the canvas? → A: Place a temporary demo node on the canvas, highlight one of its sockets, and remove the node when the tutorial ends or advances past step 3.
- Q: When the user navigates away from the Visual Designer view during the tutorial, should the tutorial pause (resumable) or dismiss entirely? → A: Dismiss entirely — the tutorial is lightweight enough to restart from scratch via the manual trigger.
- Q: Where should the manual trigger to restart the tutorial be placed? → A: A help icon button (e.g., "?") in the header bar, consistent with the existing header layout.
- Q: When should the tutorial auto-start for first-time users — immediately on page load, or after the canvas has rendered? → A: After the Visual Designer canvas has fully rendered, with a brief delay (~500 ms) so the user sees the interface before the overlay appears.

## 1.2. User Scenarios & Testing *(mandatory)*

<!--
  User stories are prioritised as user journeys ordered by importance.
  Each story is independently testable and delivers standalone value.
-->

### 1.2.1. User Story 1 — Step-by-Step Guided Walkthrough (Priority: P1)

A first-time user opens Frontier Flow and is offered a guided tutorial that walks them through the five key interface areas one at a time. At each step, the rest of the screen dims behind a semi-transparent overlay while the highlighted element remains fully visible and interactive-looking. A tooltip card explains what the highlighted element does, with "Next" and "Dismiss" buttons. The user advances through all five steps in sequence, gaining enough understanding to begin building a flow.

**Tutorial Steps (in order)**:

1. **Network/Server Selector** — "Select the network you want to deploy to here"
2. **Toolbox** — "Drag nodes from here into the canvas to create a flow."
3. **A Visible Socket** — "Drag from a socket to a matching socket to connect two nodes"
4. **Save / Load** — "You can save or load a previous flow from the Browser Storage, or export YAML to share"
5. **Visual/Code/Deploy/Authorize** — "Once your flow is complete, move on to review the code and Deploy from here"

**Why this priority**: This is the core value of the feature. Without the step-by-step walkthrough, there is no tutorial. It provides the primary means for new users to discover the interface and is the minimum viable product.

**Independent Test**: Can be fully tested by triggering the tutorial, advancing through all five steps via the "Next" button, and verifying that each step highlights the correct element, displays the correct message, and dims the rest of the screen.

**Acceptance Scenarios**:

1. **Given** the tutorial is active and on step 1, **When** the user views the screen, **Then** the Network/Server selector is visually highlighted, the rest of the screen is dimmed, and a tooltip displays "Select the network you want to deploy to here" with "Next" and "Dismiss" buttons.
2. **Given** the tutorial is on any step, **When** the user clicks "Next", **Then** the highlight and tooltip smoothly transition to the next element in the sequence.
3. **Given** the tutorial is on the final step (step 5), **When** the user clicks "Next" (or a "Finish" button), **Then** the tutorial overlay is dismissed and the full interface becomes interactive.
4. **Given** the tutorial is active on any step, **When** the user clicks "Dismiss", **Then** the tutorial ends immediately, the overlay is removed, and the full interface becomes interactive.
5. **Given** the tutorial is active, **When** the user views a highlighted element, **Then** the element appears visually "lifted" above the dimmed overlay (e.g., at full brightness with no overlay covering it), and the tooltip card is positioned near the highlighted element without overlapping it.

---

### 1.2.2. User Story 2 — Tutorial Trigger and Auto-Start for New Users (Priority: P2)

A first-time visitor to Frontier Flow is automatically offered the guided tutorial on their first visit. The tutorial can also be manually triggered at any time from the interface (e.g., via a help button or menu option). A returning user who has already completed or dismissed the tutorial is not shown it again automatically but can re-trigger it manually.

**Why this priority**: Without a clear entry point, users may never discover the tutorial. Auto-start for new users ensures discoverability; manual re-trigger ensures the tutorial remains accessible for users who want a refresher.

**Independent Test**: Can be tested by clearing local state, loading the application, and verifying the tutorial starts automatically. Then dismiss it, reload, and verify it does not auto-start again. Then trigger it manually from the help control and verify it starts.

**Acceptance Scenarios**:

1. **Given** a user visits Frontier Flow for the first time (no prior tutorial state saved), **When** the application loads and the Visual Designer is displayed, **Then** the tutorial begins automatically at step 1.
2. **Given** a user has previously completed or dismissed the tutorial, **When** they visit Frontier Flow again, **Then** the tutorial does not start automatically.
3. **Given** a user has previously dismissed the tutorial, **When** they click the manual tutorial trigger control, **Then** the tutorial starts again from step 1.
4. **Given** the tutorial auto-starts, **When** the user dismisses it immediately without viewing any steps, **Then** the dismissal is respected and the tutorial is recorded as seen.

---

### 1.2.3. User Story 3 — Accessible and Responsive Tutorial Experience (Priority: P3)

The tutorial overlay and tooltip are fully accessible and responsive. Users navigating with a keyboard can advance or dismiss the tutorial using keyboard controls. The tutorial adapts to different viewport sizes, ensuring the tooltip and highlight remain correctly positioned. Screen readers announce each tutorial step.

**Why this priority**: Accessibility is essential to meet the project's WCAG 2.1 AA commitment and ensure inclusivity. Responsive behaviour ensures the tutorial works across device sizes.

**Independent Test**: Can be tested by tabbing through the tutorial with a keyboard, verifying focus management, and resizing the viewport to check that highlights and tooltips reposition correctly.

**Acceptance Scenarios**:

1. **Given** the tutorial is active, **When** the user presses Tab, **Then** focus moves between the "Next" and "Dismiss" buttons within the tooltip card.
2. **Given** the tutorial is active and focus is on the "Next" button, **When** the user presses Enter or Space, **Then** the tutorial advances to the next step.
3. **Given** the tutorial is active, **When** the user presses Escape, **Then** the tutorial is dismissed immediately.
4. **Given** the tutorial is active and a step's tooltip is visible, **When** a screen reader reads the tooltip, **Then** it announces the step number, total steps, the highlighted element's purpose, and the description text.
5. **Given** the tutorial is active, **When** the viewport is resized or the target element moves (e.g., a drawer opens/closes), **Then** the highlight and tooltip reposition to remain correctly aligned with the target element.

---

### 1.2.4. User Story 4 — Step Progress Indication (Priority: P4)

The tutorial tooltip card shows which step the user is on and how many steps remain (e.g., "Step 2 of 5"), giving the user a clear sense of progress through the tutorial.

**Why this priority**: Progress indication reduces uncertainty and encourages users to complete the tutorial. It is an enhancement over the core walkthrough.

**Independent Test**: Can be tested by advancing through each step and verifying the progress indicator updates correctly.

**Acceptance Scenarios**:

1. **Given** the tutorial is active on step N, **When** the user views the tooltip card, **Then** a progress indicator displays "Step N of 5" (or equivalent visual representation such as dots or a progress bar).
2. **Given** the user is on step 1, **When** they view the tooltip, **Then** there is no "Back" or "Previous" button (the tutorial is forward-only for simplicity).

---

### 1.2.5. Edge Cases

- What happens when the toolbox drawer is collapsed when the tutorial reaches step 2? The tutorial should ensure the toolbox is visible (expand it if needed) before highlighting it.
- What happens when there are no nodes on the canvas and therefore no visible sockets when step 3 is reached? The tutorial places a temporary demonstration node on the canvas, highlights one of its sockets, and removes the demo node when the tutorial advances past step 3 or is dismissed.
- What happens if the Save/Load drawer (`contract-panel`) is collapsed when step 4 is reached? The tutorial should expand it before highlighting.
- What happens when the user navigates away from the Visual Designer view (e.g., switches to Code view) while the tutorial is active? The tutorial dismisses entirely (does not pause). The user can restart it via the manual trigger in the header.
- What happens if the browser window is very narrow and the tooltip would overflow the viewport? The tooltip should reposition (e.g., flip sides or move below) to remain fully visible.
- What happens if the user refreshes the page mid-tutorial? The tutorial state is lost and the user is not shown the tutorial again (it counts as seen), but they can manually re-trigger it.

## 1.3. Requirements *(mandatory)*

### 1.3.1. Functional Requirements

- **FR-001**: System MUST display a full-screen semi-transparent overlay that dims the entire interface except the currently highlighted element during each tutorial step.
- **FR-002**: System MUST show a tooltip card adjacent to the highlighted element containing: the description text for that step, a step progress indicator, a "Next" button (or "Finish" on the last step), and a "Dismiss" button.
- **FR-003**: System MUST highlight the following five elements in order:
  1. Network/Server selector with message "Select the network you want to deploy to here"
  2. Toolbox with message "Drag nodes from here into the canvas to create a flow."
  3. A visible socket with message "Drag from a socket to a matching socket to connect two nodes"
  4. Save / Load panel with message "You can save or load a previous flow from the Browser Storage, or export YAML to share"
  5. Visual/Code/Deploy/Authorize navigation with message "Once your flow is complete, move on to review the code and Deploy from here"
- **FR-004**: System MUST transition smoothly between steps when the user clicks "Next", moving the highlight and tooltip to the next element.
- **FR-005**: System MUST dismiss the entire tutorial immediately when the user clicks "Dismiss" at any step, removing the overlay and restoring full interactivity.
- **FR-006**: System MUST automatically start the tutorial on the first visit to the application when no prior tutorial completion state exists, beginning after the Visual Designer canvas has fully rendered with a brief delay (~500 ms).
- **FR-007**: System MUST persist a flag indicating the tutorial has been seen so it does not auto-start on subsequent visits.
- **FR-008**: System MUST provide a help icon button (e.g., "?") in the header bar to restart the tutorial at any time, placed consistently with the existing header layout.
- **FR-009**: System MUST support keyboard navigation: Tab to move focus between tooltip buttons, Enter/Space to activate the focused button, Escape to dismiss.
- **FR-010**: System MUST ensure the highlighted element appears visually elevated above the dimming overlay (at full opacity/brightness, not covered by the overlay).
- **FR-011**: System MUST ensure the tooltip card does not overlap the highlighted element and remains within the viewport boundaries.
- **FR-012**: System MUST ensure drawers or panels required for a tutorial step (Toolbox, Save/Load) are expanded/visible before highlighting them.
- **FR-013**: System MUST place a temporary demonstration node on the canvas for the socket step (step 3) when no nodes are present, highlight one of its sockets, and remove the demo node when the tutorial advances past step 3 or is dismissed.
- **FR-014**: System MUST announce each tutorial step to screen readers, including step number, total steps, and the description text.
- **FR-015**: System MUST dismiss the tutorial entirely when the user navigates away from the Visual Designer view. The tutorial does not pause or resume — the user can restart it via the header help button.
- **FR-016**: System MUST display a step progress indicator (e.g., "Step N of 5" or equivalent dots/bar) within the tooltip card.
- **FR-017**: System MUST skip a tutorial step and advance to the next if the target element cannot be resolved after 3 retry attempts (100ms apart), ensuring the tutorial does not stall on an unmountable element.

### 1.3.2. Key Entities

- **Tutorial Step**: Represents a single step in the guided walkthrough. Has an ordinal position, a target element identifier, a description message, and optional tooltip positioning hints.
- **Tutorial State**: Represents the user's progress and history with the tutorial. Tracks whether the tutorial has been seen/completed and, optionally, which step was last viewed.
- **Tutorial Overlay**: The visual layer that dims the screen and highlights the active element. It is the container for the tooltip card and spotlight cutout.

## 1.4. Assumptions

- The tutorial persists its "seen" state in the browser's local storage (consistent with how Frontier Flow already persists user preferences like saved flows).
- The tutorial is specific to the Visual Designer view and does not cover other views (Code, Deploy, Authorize) — step 5 only points the user to those views.
- The five steps and their messages are fixed for this initial release; configurability or additional steps are out of scope.
- The tutorial overlay does not block essential background operations (e.g., wallet connections, network requests).
- The Toolbox and Save/Load drawers can be programmatically expanded when needed by the tutorial.

## 1.5. Success Criteria *(mandatory)*

### 1.5.1. Measurable Outcomes

- **SC-001** *(post-launch metric — requires analytics instrumentation)*: 90% of first-time users are presented with the tutorial automatically upon their first visit.
- **SC-002**: Users can complete the full 5-step tutorial in under 60 seconds.
- **SC-003** *(post-launch metric — requires analytics instrumentation)*: 80% of users who start the tutorial complete all 5 steps (do not dismiss early).
- **SC-004**: The tutorial is fully navigable via keyboard alone, with all interactive elements reachable via Tab and activatable via Enter/Space.
- **SC-005**: All tutorial tooltip text meets WCAG 2.1 AA contrast requirements (minimum 4.5:1 ratio against its background).
- **SC-006**: The tutorial overlay and tooltip reposition correctly when the viewport is resized, with no content overflowing or being clipped outside the visible area.
- **SC-007** *(post-launch metric — requires analytics instrumentation)*: Users who complete the tutorial demonstrate faster time-to-first-flow (placing their first node on the canvas) compared to users who skip it — target: 25% reduction in time-to-first-action.
