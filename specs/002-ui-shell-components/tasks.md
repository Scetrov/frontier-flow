# Tasks: UI Shell Components

**Input**: Design documents from `/specs/002-ui-shell-components/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialisation, test tooling, and shared configuration

- [x] T001 Add Vitest, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and Playwright scripts and dependencies in package.json
- [x] T002 Configure Vitest test runner in vite.config.ts for jsdom, globals, and the shared setup file
- [x] T003 [P] Create shared test setup in src/test/setup.ts for `@testing-library/jest-dom` and DOM cleanup hooks
- [x] T004 [P] Create Playwright configuration in playwright.config.ts for the Vite dev server and responsive browser coverage
- [x] T005 [P] Create NodeDefinition type interface in src/types/nodes.ts with `type`, `label`, `description`, and `color` fields
- [x] T006 [P] Create static node definitions data array in src/data/node-definitions.ts exporting a `readonly NodeDefinition[]` with initial entries (Aggression, Proximity, Get Tribe, etc.)
- [x] T007 Add build-time version constant to vite.config.ts via `define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0') }`
- [x] T008 Add `__APP_VERSION__` global type declaration in src/vite-env.d.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Static assets and metadata prerequisites shared by the shell stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 [P] Create branded SVG favicon at public/favicon.svg using Frontier Flow brand identity
- [x] T010 [P] Create ICO favicon fallback (32×32) at public/favicon.ico
- [x] T011 [P] Create Apple Touch Icon (180×180 PNG) at public/apple-touch-icon.png
- [x] T012 [P] Create Open Graph preview image (1200×630 PNG) at public/og-image.png with branded design
- [x] T013 [P] Create web app manifest at public/site.webmanifest referencing favicon assets and app metadata

**Checkpoint**: Test tooling and static assets are ready, so user stories can proceed independently

---

## Phase 3: User Story 1 — Application Identity and Branding (Priority: P1) 🎯 MVP

**Goal**: Browser tab shows branded favicon and "Frontier Flow" title; shared links display a rich OG preview card on social platforms (Discord, X, Slack).

**Independent Test**: Load the application in a browser and verify the tab title and favicon. Run the branding end-to-end test to confirm favicon links, manifest link, and OG/Twitter metadata are present in the rendered document head.

### Tests for User Story 1

- [x] T014 [P] [US1] Create branding metadata end-to-end test in tests/e2e/branding.spec.ts covering document title, favicon links, manifest link, and OG/Twitter meta tags

### Implementation for User Story 1

- [x] T015 [US1] Update index.html to replace the default Vite favicon with SVG, ICO, and Apple Touch Icon links
- [x] T016 [US1] Update index.html to add Open Graph and Twitter Card metadata for Frontier Flow branding
- [x] T017 [US1] Update index.html to add the site manifest link pointing to public/site.webmanifest

**Checkpoint**: User Story 1 is fully functional and testable on its own

---

## Phase 4: User Story 3 — Page Title Bar (Priority: P3)

**Goal**: A title bar at the top of the viewport displays the Frontier Flow logo and application name, providing consistent branding and layout hierarchy.

**Independent Test**: Render the Header component test to verify banner semantics, logo presence, and app title text. Open the application and confirm the title bar remains visible from 320px to 2560px without clipping.

> **Note**: P3 is implemented before P2 because the Header component is a prerequisite for the shell layout that Sidebar (P2) plugs into.

### Tests for User Story 3

- [x] T018 [P] [US3] Create Header component test in src/__tests__/Header.test.tsx covering banner landmark, logo rendering, and visible "Frontier Flow" text

### Implementation for User Story 3

- [x] T019 [US3] Create Header component in src/components/Header.tsx using `<header>` semantics, the Frontier Flow logo from assets/LogoSquare@2x.png, and design-system typography
- [x] T020 [US3] Refine responsive Header layout in src/components/Header.tsx to prevent overflow or clipping from 320px to 2560px

**Checkpoint**: Header component renders correctly in isolation and passes its component test

---

## Phase 5: User Story 4 — Footer (Priority: P4)

**Goal**: A footer at the bottom of the viewport displays the version number and a link to the project repository.

**Independent Test**: Render the Footer component test to verify version output and repository link semantics. Open the application and confirm the footer remains readable across viewport widths.

> **Note**: P4 is implemented before P2 because the Footer component is a prerequisite for the shell layout that Sidebar (P2) plugs into.

### Tests for User Story 4

- [x] T021 [P] [US4] Create Footer component test in src/__tests__/Footer.test.tsx covering `__APP_VERSION__` rendering and the repository link target

### Implementation for User Story 4

- [x] T022 [US4] Create Footer component in src/components/Footer.tsx using `<footer>` semantics, `__APP_VERSION__`, and the repository link
- [x] T023 [US4] Refine responsive Footer layout in src/components/Footer.tsx to keep content readable from 320px to 2560px

**Checkpoint**: Footer component renders correctly in isolation and passes its component test

---

## Phase 6: User Story 2 — Side Panel for Node Toolbox (Priority: P2)

**Goal**: A right-side collapsible panel lists available node definitions as draggable cards. Users can browse and drag nodes onto the canvas. On mobile (<768px), the panel collapses behind a toggle.

**Independent Test**: Run the Sidebar component test to verify node listing, drag-start data, and empty state handling. Run the sidebar end-to-end test to verify the mobile toggle and overlay. Then open the application and verify drag initiation from the toolbox toward the canvas region.

### Tests for User Story 2

- [x] T024 [P] [US2] Create Sidebar component test in src/__tests__/Sidebar.test.tsx covering node listing, empty state messaging, and `dataTransfer` payloads during drag start
- [x] T025 [P] [US2] Create mobile sidebar end-to-end test in tests/e2e/sidebar.spec.ts covering the toggle button, overlay backdrop, and open/close behaviour below the `md` breakpoint

### Implementation for User Story 2

- [x] T026 [US2] Create Sidebar component in src/components/Sidebar.tsx rendering the NodeDefinition array as draggable cards inside an `<aside aria-label="Node toolbox">`
- [x] T027 [US2] Implement responsive mobile collapse and overlay toggle in src/components/Sidebar.tsx using `md:` utilities, a lucide-react toggle button, and transition classes
- [x] T028 [US2] Add empty state rendering in src/components/Sidebar.tsx for zero node definitions
- [x] T029 [US2] Add keyboard accessibility and `:focus-visible` treatment for toggle and interactive sidebar controls in src/components/Sidebar.tsx
- [x] T030 [US2] Compose the shell layout in src/App.tsx with `<Header />`, a labelled canvas region, `<Sidebar />`, and `<Footer />` using semantic landmarks from R-004

**Checkpoint**: Full shell layout is assembled, the toolbox drag interaction starts correctly, and the mobile sidebar flow is testable on its own

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and execution of the automated test suite

- [x] T031 [P] Update specs/002-ui-shell-components/quickstart.md with component-test, end-to-end test, and metadata verification commands
- [x] T032 [P] Run Vitest component tests from package.json against src/__tests__/Header.test.tsx, src/__tests__/Footer.test.tsx, and src/__tests__/Sidebar.test.tsx
- [x] T033 [P] Run Playwright end-to-end tests from playwright.config.ts against tests/e2e/branding.spec.ts and tests/e2e/sidebar.spec.ts
- [x] T034 [P] Verify semantic landmarks, keyboard tab order, focus indicators, and no horizontal scrollbar across 320px, 768px, 1024px, 1440px, and 2560px in src/App.tsx and src/components/*.tsx
- [x] T035 Run `bun run lint`, `tsc -b`, and `bun run build` to confirm the feature is production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends only on Setup tooling when asset-related tests need to run locally
- **US1 — Branding (Phase 3)**: Depends on Foundational for favicon, manifest, and OG image assets
- **US3 — Header (Phase 4)**: Depends on Setup only
- **US4 — Footer (Phase 5)**: Depends on Setup for `__APP_VERSION__`
- **US2 — Sidebar (Phase 6)**: Depends on Setup for node types/data and on US3 plus US4 for final shell composition in src/App.tsx
- **Polish (Phase 7)**: Depends on all story phases completing

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only and is the recommended MVP
- **US3 (P3)**: Depends on Phase 1 only and can proceed in parallel with US1 once setup is done
- **US4 (P4)**: Depends on Phase 1 only and can proceed in parallel with US3
- **US2 (P2)**: Depends on Phase 1 for node data and on US3 plus US4 for T030 shell composition

### Within Each User Story

- Write the story test tasks first and ensure they fail before implementation
- Implement the core component or metadata updates next
- Finish responsive and accessibility refinements after the base implementation
- Validate the story independently before moving to the next checkpoint

### Parallel Opportunities

- T003, T004, T005, T006 can run in parallel after T001 and T002
- T009, T010, T011, T012, T013 can run in parallel because they touch separate asset files
- T018 and T021 can run in parallel because Header and Footer are independent components
- T024 and T025 can run in parallel because component and end-to-end sidebar coverage are separate files
- T031, T032, T033, and T034 can run in parallel during polish

---

## Parallel Example: Setup + Foundational

```
# After T001 and T002, launch these together:
Task T003: "Create shared test setup in src/test/setup.ts"
Task T004: "Create Playwright configuration in playwright.config.ts"
Task T005: "Create NodeDefinition type interface in src/types/nodes.ts"
Task T006: "Create static node definitions data array in src/data/node-definitions.ts"
Task T009: "Create branded SVG favicon at public/favicon.svg"
Task T010: "Create ICO favicon fallback at public/favicon.ico"
Task T011: "Create Apple Touch Icon at public/apple-touch-icon.png"
Task T012: "Create Open Graph preview image at public/og-image.png"
Task T013: "Create web app manifest at public/site.webmanifest"
```

## Parallel Example: Header + Footer

```
# After Setup completes, launch these together:
Task T018: "Create Header component test in src/__tests__/Header.test.tsx"
Task T019: "Create Header component in src/components/Header.tsx"
Task T021: "Create Footer component test in src/__tests__/Footer.test.tsx"
Task T022: "Create Footer component in src/components/Footer.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T008)
2. Complete Phase 2: Foundational (T009–T013)
3. Write and run T014 so branding coverage exists first
4. Complete Phase 3: User Story 1 implementation (T015–T017)
5. **STOP and VALIDATE**: Re-run the branding test and verify the metadata manually

### Incremental Delivery

1. Complete Setup + Foundational to establish tooling and assets
2. Deliver US1 and validate the branding metadata end to end
3. Deliver US3 and US4 in parallel with component tests
4. Deliver US2 with both component and end-to-end coverage, then assemble the shell in src/App.tsx
5. Finish polish by running all tests, accessibility checks, lint, type-check, and build

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to a specific user story for traceability
- US3 and US4 are implemented before US2 because src/App.tsx composition depends on Header and Footer existing
- Tests are included because the implementation plan explicitly calls for Vitest and Playwright coverage
- Commit after each task or logical group
- Stop at each checkpoint to validate the story independently
