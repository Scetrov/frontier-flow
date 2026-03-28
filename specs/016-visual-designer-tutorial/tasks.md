# Tasks: Visual Designer Guided Tutorial

**Input**: Design documents from `specs/016-visual-designer-tutorial/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create new files, type scaffolding, and CSS foundation

- [ ] T001 [P] Create tutorial type definitions (`TutorialStepId`, `TutorialStepDefinition`, `TutorialState`, `TutorialPersistedState`) in `src/types/tutorial.ts`
- [ ] T002 [P] Add `ff-tutorial__*` CSS classes (spotlight, tooltip, target highlight, progress, backdrop, transitions) in `src/index.css`
- [ ] T003 [P] Create tutorial step definitions array with element resolvers, tooltip position hints, drawer requirements, and demo node flags in `src/utils/tutorialSteps.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hook and persistence logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `useTutorial` hook with state machine (isActive, currentStepIndex, targetRect, tooltipVisible), step navigation (next/dismiss/start), `getBoundingClientRect()` measurement with retry logic, and resize/scroll listener for rect recalculation in `src/hooks/useTutorial.ts`
- [ ] T005 Implement localStorage persistence in `useTutorial` — load `TutorialPersistedState` from `frontier-flow:tutorial` on mount, save `hasSeenTutorial: true` on dismiss/finish, handle missing/corrupt/version-mismatch data by resetting to defaults in `src/hooks/useTutorial.ts`

**Checkpoint**: `useTutorial` hook is complete — returns `{ isActive, currentStep, currentStepIndex, totalSteps, targetRect, next, dismiss, start }`

---

## Phase 3: User Story 1 — Step-by-Step Guided Walkthrough (Priority: P1) 🎯 MVP

**Goal**: 5-step guided walkthrough with spotlight overlay, tooltip card, Next/Dismiss buttons, and smooth transitions between steps

**Independent Test**: Trigger tutorial, advance through all 5 steps via Next, verify each step highlights the correct element with the correct message and dims the rest of the screen

### Implementation for User Story 1

- [ ] T006 [US1] Create `TutorialOverlay` component with spotlight `<div>` (CSS `box-shadow` technique at z-60), positioned/sized from `targetRect` prop, and overlay backdrop (fixed, full viewport) in `src/components/TutorialOverlay.tsx`
- [ ] T007 [US1] Add tooltip card rendering inside `TutorialOverlay` — message text, "Next" button (or "Finish" on last step), "Dismiss" button, positioned adjacent to spotlight via `tooltipPosition` hint with viewport-aware flipping, at z-61 in `src/components/TutorialOverlay.tsx`
- [ ] T008 [US1] Add step progress indicator ("Step N of 5") to the tooltip card in `src/components/TutorialOverlay.tsx`
- [ ] T009 [US1] Implement tooltip fade transition — set `tooltipVisible = false` on step change, update position, then `tooltipVisible = true` (CSS opacity/transform transitions, 200ms) in `src/components/TutorialOverlay.tsx`
- [ ] T010 [US1] Wire drawer expansion logic in `useTutorial` — when entering a step with `requiresDrawerOpen`, call `onExpandDrawer` callback before measuring target rect; handle sidebar (step 2) and contract-panel (step 4) in `src/hooks/useTutorial.ts`
- [ ] T011 [US1] Wire demo node logic in `useTutorial` — when entering step 3 (socket), if canvas is empty call `onInsertDemoNode`; on advancing past step 3 or dismissing, call `onRemoveDemoNode`; use constant ID `"tutorial-demo-node"` in `src/hooks/useTutorial.ts`
- [ ] T012 [US1] Mount `TutorialOverlay` in `App.tsx` — instantiate `useTutorial` with `isCanvasReady`, `activeView`, drawer/demo-node callbacks; pass return values as props to `<TutorialOverlay />`; wire `onInsertDemoNode`/`onRemoveDemoNode` to `setNodes` in `src/App.tsx`
- [ ] T013 [US1] Add `ff-tutorial__target` CSS class application — in `useTutorial`, when a step is active, add `position: relative; z-index: 60` class to the resolved target element and remove it on step change or dismiss in `src/hooks/useTutorial.ts`

**Checkpoint**: Full 5-step tutorial works when triggered manually. Spotlight, tooltip, Next/Finish, Dismiss, smooth transitions, drawer expansion, demo node all functional.

---

## Phase 4: User Story 2 — Tutorial Trigger and Auto-Start (Priority: P2)

**Goal**: Auto-start on first visit (after canvas ready + 500ms delay); manual restart via header "?" button; persist seen state so auto-start only fires once

**Independent Test**: Clear localStorage, reload → tutorial auto-starts. Dismiss, reload → no auto-start. Click "?" → tutorial restarts.

### Implementation for User Story 2

- [ ] T014 [US2] Implement auto-start logic in `useTutorial` — on mount, if `!hasSeenTutorial` and `isCanvasReady` and `activeView === "visual"`, start tutorial after 500ms `setTimeout`; cancel timer on unmount or if conditions change in `src/hooks/useTutorial.ts`
- [ ] T015 [US2] Add `onStartTutorial` prop to `HeaderProps` and render a "?" help button inside `HeaderActions` (before `WalletStatus`) with `aria-label="Start tutorial"`, `title="Start tutorial"`, class `ff-header__help-button` in `src/components/Header.tsx`
- [ ] T016 [US2] Add `ff-header__help-button` CSS styles — consistent with existing header button styling, hover/focus states matching design system in `src/index.css`
- [ ] T017 [US2] Wire `onStartTutorial` callback from `App.tsx` to `useTutorial.start()` and pass it as prop to `<Header />` in `src/App.tsx`

**Checkpoint**: Tutorial auto-starts for new users, persists seen state, and can be re-triggered via header button.

---

## Phase 5: User Story 3 — Accessible and Responsive Experience (Priority: P3)

**Goal**: Full keyboard navigation (Tab/Enter/Escape), focus trapping, screen reader announcements, responsive repositioning

**Independent Test**: Tab through tutorial with keyboard, verify focus cycling. Press Escape to dismiss. Resize viewport, verify tooltip repositions. Run screen reader, verify announcements.

### Implementation for User Story 3

- [ ] T018 [US3] Implement focus trapping in `TutorialOverlay` — on step mount focus tooltip panel ref; Tab/Shift+Tab cycles between Next and Dismiss; reuse `getFocusableElements` + `trapFocusWithinPanel` pattern from existing modals in `src/components/TutorialOverlay.tsx`
- [ ] T019 [US3] Add Escape key handler in `TutorialOverlay` — keydown listener calls `onDismiss` on Escape key in `src/components/TutorialOverlay.tsx`
- [ ] T020 [US3] Add ARIA attributes to `TutorialOverlay` — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to tooltip title; add `aria-live="polite"` region for step description announcements in `src/components/TutorialOverlay.tsx`
- [ ] T021 [US3] Implement viewport resize handler in `useTutorial` — on window `resize` event, recalculate `targetRect` via `getBoundingClientRect()` on the current target element; debounce at 100ms in `src/hooks/useTutorial.ts`

**Checkpoint**: Tutorial is fully keyboard-navigable, screen-reader-announced, and responsive to viewport changes.

---

## Phase 6: User Story 4 — Step Progress Indication (Priority: P4)

**Goal**: Visual progress indicator showing "Step N of 5" in the tooltip card

**Independent Test**: Advance through each step and verify progress text updates correctly.

### Implementation for User Story 4

- [ ] T022 [US4] Enhance progress indicator in tooltip card — render "Step {currentStepIndex + 1} of {totalSteps}" text and optional dot indicators (5 dots, current dot highlighted with `--brand-orange`) in `src/components/TutorialOverlay.tsx`

**Checkpoint**: Progress indicator updates correctly at each step. Forward-only navigation (no Back button).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests, validation, and cleanup across all stories

- [ ] T023 [P] Create unit tests for `useTutorial` hook — state transitions (start/next/dismiss), localStorage read/write/corrupt-data handling, auto-start timer logic, drawer expansion callbacks, demo node insertion/cleanup, resize handler, view-change dismissal in `src/__tests__/useTutorial.test.ts`
- [ ] T024 [P] Create unit tests for `TutorialOverlay` — rendering when active/inactive, spotlight positioning from targetRect, tooltip positioning with flip logic, Next/Finish/Dismiss button callbacks, keyboard navigation (Tab cycling, Escape dismiss), ARIA attributes, progress indicator in `src/__tests__/TutorialOverlay.test.tsx`
- [ ] T025 [P] Create unit tests for `tutorialSteps` — step count, step order, message text, tooltip positions, resolveTarget returns expected elements (with mocked DOM), requiresDrawerOpen values, requiresDemoNode flags in `src/__tests__/tutorialSteps.test.ts`
- [ ] T026 Create Playwright E2E test — full 5-step walkthrough (start → Next × 4 → Finish), dismiss mid-tutorial, auto-start on first visit, no auto-start on revisit, manual restart via "?" button, keyboard navigation, `axe-core` accessibility audit during active tutorial in `tests/e2e/tutorial.spec.ts`
- [ ] T027 Run `quickstart.md` validation — follow all manual testing steps in `specs/016-visual-designer-tutorial/quickstart.md` and verify they pass
- [ ] T028 Update existing `Header.test.tsx` — add test case for "?" help button rendering and `onStartTutorial` callback in `src/__tests__/Header.test.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All 3 tasks run in parallel.
- **Foundational (Phase 2)**: Depends on T001 (types) and T003 (step definitions). BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Phase 2 completion. Requires T002 (CSS) for visual correctness.
- **US2 (Phase 4)**: Depends on Phase 2 (auto-start logic) and T006–T007 (overlay rendering).
- **US3 (Phase 5)**: Depends on T006–T007 (overlay component exists for adding a11y).
- **US4 (Phase 6)**: Depends on T007 (tooltip card exists for adding progress dots).
- **Polish (Phase 7)**: Depends on all story phases being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No dependency on other stories. This is the MVP.
- **US2 (P2)**: Can start after Phase 2 + US1 overlay mount (T012). Header button (T015) is parallel with overlay.
- **US3 (P3)**: Can start after US1 overlay component exists (T006–T007). Independent of US2.
- **US4 (P4)**: Can start after US1 tooltip card exists (T007). Independent of US2/US3.

### Within Each User Story

- Overlay structure (T006) before tooltip content (T007–T009)
- Hook logic (T010–T011) before App wiring (T012)
- CSS class application (T013) after hook is functional

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 — all different files, fully parallel
- **Phase 3 (US1)**: T006 + T010 + T011 can start in parallel (overlay vs hook logic)
- **Phase 4 (US2)**: T015 + T016 can run parallel with T014
- **Phase 5 (US3)**: T018 + T019 + T020 touch same file but are additive sections — sequential within file
- **Phase 7**: T023, T024, T025 — all different test files, fully parallel

---

## Parallel Example: Phase 1 + Early Phase 2

```text
# All Phase 1 tasks in parallel (different files):
T001: src/types/tutorial.ts
T002: src/index.css
T003: src/utils/tutorialSteps.ts

# Then Phase 2 (sequential, same file):
T004: src/hooks/useTutorial.ts (state machine)
T005: src/hooks/useTutorial.ts (persistence)
```

## Parallel Example: Phase 7 Tests

```text
# All test files in parallel:
T023: src/__tests__/useTutorial.test.ts
T024: src/__tests__/TutorialOverlay.test.tsx
T025: src/__tests__/tutorialSteps.test.ts
T028: src/__tests__/Header.test.tsx (update existing)

# Then E2E (depends on all code complete):
T026: tests/e2e/tutorial.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003) — all parallel
2. Complete Phase 2: Foundational (T004–T005) — sequential, same file
3. Complete Phase 3: US1 (T006–T013) — core walkthrough
4. **STOP and VALIDATE**: Trigger tutorial manually, walk through all 5 steps
5. Deployable MVP — users can experience the full 5-step tutorial

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → **MVP deployed** (manual trigger only)
3. Add US2 → Test independently → Auto-start + header button
4. Add US3 → Test independently → Full accessibility
5. Add US4 → Test independently → Progress dots
6. Add Polish → Full test suite + E2E + quickstart validation

### Parallel Team Strategy

With 2 developers after Phase 2 completion:

- **Developer A**: US1 (T006–T013) → US3 (T018–T021)
- **Developer B**: US2 (T014–T017) → US4 (T022) → Polish (T023–T028)

---

## Notes

- [P] tasks = different files, no dependencies — safe to run concurrently
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Demo node ID is always `"tutorial-demo-node"` — deterministic cleanup
- All CSS uses `ff-tutorial__*` BEM prefix — no class name collisions
- Z-index: overlay at z-60, tooltip at z-61, target highlight at z-60
