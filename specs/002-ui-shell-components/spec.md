# Feature Specification: UI Shell Components

**Feature Branch**: `002-ui-shell-components`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "I would like to build the high level UI components including a title, favicon, OG, side panel and footer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Application Identity and Branding (Priority: P1)

A visitor navigates to the Frontier Flow URL for the first time. The browser tab displays the Frontier Flow favicon and title, and when the link is shared on social platforms (Discord, X, Slack) a rich Open Graph preview card appears with the application name, description, and a branded image.

**Why this priority**: First impressions determine whether users trust and engage with the tool. Without a proper title, favicon, and OG metadata the application looks unfinished and shares poorly on social platforms — both critical for adoption in the EVE Frontier community.

**Independent Test**: Can be fully tested by loading the application in a browser, inspecting the tab for correct favicon/title, and pasting the URL into a social media link preview tool (e.g., Open Graph debugger) to verify the OG card renders correctly.

**Acceptance Scenarios**:

1. **Given** a user opens the application in a browser, **When** the page loads, **Then** the browser tab displays the Frontier Flow branded favicon and the document title reads "Frontier Flow".
2. **Given** a user shares the application URL on a social platform, **When** the platform fetches OG metadata, **Then** a preview card appears showing the application name, a short description, and a branded image.
3. **Given** a user opens the application in multiple tabs, **When** they scan their browser tab bar, **Then** the Frontier Flow favicon is clearly distinguishable from other tabs.

---

### User Story 2 - Side Panel for Node Toolbox (Priority: P2)

A user opens the application and sees a side panel containing the available node categories. They can browse node definitions (e.g., Aggression, Proximity, Get Tribe) and drag them onto the canvas to build their workflow.

**Why this priority**: The side panel is the primary entry point for placing nodes on the canvas — without it, users cannot construct workflows. It is the most critical interactive UI shell element.

**Independent Test**: Can be fully tested by opening the application, verifying the side panel is visible, confirming that node definitions are listed, and verifying at least one node can be dragged from the panel toward the canvas area.

**Acceptance Scenarios**:

1. **Given** the application has loaded, **When** the user views the interface, **Then** a side panel is visible listing available node types grouped or categorised.
2. **Given** the side panel is open, **When** the user initiates a drag on a node definition, **Then** the drag interaction begins and the node type data is carried with the drag event.
3. **Given** the viewport is narrow (below 768px), **When** the user views the interface, **Then** the side panel collapses or is hidden behind a toggle to preserve canvas space.
4. **Given** the side panel is collapsed on a narrow viewport, **When** the user activates the toggle, **Then** the side panel opens as an overlay without displacing the canvas.

---

### User Story 3 - Page Title Bar (Priority: P3)

A user opens the application and sees a title bar at the top of the viewport displaying the Frontier Flow logo and application name. The title bar provides consistent branding context and anchors the layout.

**Why this priority**: The title bar establishes visual hierarchy and brand identity within the application. It is relatively simple but essential for a polished, professional appearance.

**Independent Test**: Can be fully tested by opening the application and verifying the title bar is visible at the top of the viewport with the correct logo and application name.

**Acceptance Scenarios**:

1. **Given** the application has loaded, **When** the user views the interface, **Then** a title bar is visible at the top displaying the Frontier Flow logo and name.
2. **Given** any viewport width from 320px to 2560px, **When** the user views the title bar, **Then** the logo and title remain visible and correctly positioned without clipping or overflow.

---

### User Story 4 - Footer (Priority: P4)

A user scrolls to or views the bottom of the application and sees a footer containing version information and relevant links (e.g., documentation, source repository). The footer provides a sense of completeness and professional polish.

**Why this priority**: The footer is the lowest-priority visual shell element. It adds polish and offers useful links but does not gate any core workflow functionality.

**Independent Test**: Can be fully tested by opening the application and verifying the footer is visible at the bottom, displaying the expected content.

**Acceptance Scenarios**:

1. **Given** the application has loaded, **When** the user views the bottom of the interface, **Then** a footer is visible displaying version information.
2. **Given** the footer is visible, **When** the user inspects the footer content, **Then** it contains at least a link to the project repository.
3. **Given** any viewport width from 320px to 2560px, **When** the user views the footer, **Then** the content remains readable and correctly laid out.

---

### Edge Cases

- What happens when the favicon file fails to load? The browser should fall back to its default favicon without breaking the page.
- What happens when OG metadata image URL is unreachable? Social platforms should still display the text-based preview (title + description) gracefully.
- What happens when the side panel contains zero node definitions (e.g., a data loading issue)? The panel should display an empty state message rather than appearing blank.
- How does the layout behave at extremely narrow widths (320px)? All shell components must remain usable without horizontal scroll on the main viewport.
- What happens when a user resizes the browser from wide to narrow while the side panel is open? The side panel should transition to its collapsed state smoothly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display a branded favicon in the browser tab that is distinct and recognisable at 16×16 and 32×32 pixel sizes.
- **FR-002**: The application MUST set the document title to "Frontier Flow" on page load.
- **FR-003**: The application MUST include Open Graph meta tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) in the document head so that shared links render a rich preview card.
- **FR-004**: The application MUST render a title bar at the top of the viewport containing the Frontier Flow logo and application name.
- **FR-005**: The application MUST render a side panel that lists all available node types with their name and a short description.
- **FR-006**: Each node definition in the side panel MUST be draggable, initiating drag-and-drop with the node type identifier.
- **FR-007**: The side panel MUST collapse on viewports narrower than 768px and provide a toggle control to open/close it.
- **FR-008**: The application MUST render a footer at the bottom of the viewport containing version information and a link to the project repository.
- **FR-009**: All shell components (title bar, side panel, footer) MUST follow the design system: Disket Mono for headings, 0px border-radius, theme-aware CSS variables, and WCAG 2.1 AA contrast ratios.
- **FR-010**: All interactive elements in the shell (toggle buttons, links) MUST be keyboard-accessible and display a visible focus indicator using `:focus-visible`.
- **FR-011**: The title bar, side panel, and footer MUST use semantic HTML elements and include appropriate ARIA attributes for screen reader compatibility.

### Key Entities

- **Node Definition**: Represents a draggable node type available in the side panel. Attributes: type identifier, display label, short description, category colour.
- **Shell Layout**: The top-level page structure composed of title bar, canvas area, side panel, and footer arranged in a responsive grid or flex layout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of shared links on major social platforms (Discord, X, Slack) display a rich OG preview card with title, description, and image.
- **SC-002**: The favicon is visible and recognisable in the browser tab across Chrome, Firefox, Safari, and Edge.
- **SC-003**: Users can identify and drag a node from the side panel onto the canvas area within 5 seconds of opening the application for the first time.
- **SC-004**: All shell components render correctly without horizontal scrollbar at viewport widths from 320px to 2560px.
- **SC-005**: All interactive elements in the shell pass automated accessibility audits (keyboard navigation, focus indicators, ARIA attributes, contrast ratios).
- **SC-006**: The title bar, side panel, and footer load and render within 1 second of the initial page load on a standard broadband connection.

## Assumptions

- The Frontier Flow brand assets (logo SVG, OG image) already exist or will be created as part of this feature.
- The existing design system (Disket Mono font, CSS variables, dark theme) is already configured and available.
- The side panel implements drag-and-drop using the HTML5 Drag and Drop API, consistent with the existing architecture.
- Version information for the footer can be derived from the project's package metadata.
- The application is a single-page application; the footer is always visible at the bottom of the viewport (not below a scroll fold).
