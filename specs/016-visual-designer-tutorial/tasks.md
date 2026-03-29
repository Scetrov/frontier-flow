# 1. Tasks: Visual Designer Guided Tutorial

**Input**: Design documents from `specs/016-visual-designer-tutorial/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Unit tests are co-located with their implementation phase per Constitution §VI (TDD).

## 1.1. Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## 1.2. Phase 1: Setup

**Purpose**: Create new files, type scaffolding, CSS foundation, and step configuration with tests

- [X] T001 [P] Create tutorial type definitions (`TutorialStepId`, `TutorialStepDefinition`, `TutorialState`, `TutorialPersistedState`) with readonly fields and discriminated unions in `src/types/tutorial.ts`
- [X] T002 [P] Add `ff-tutorial__*` CSS classes (spotlight with `box-shadow: 0 0 0 9999px`, tooltip card, target highlight at z-60, progress dots, backdrop, 300ms spotlight transitions, 200ms tooltip opacity/transform transitions) in `src/index.css`
- [X] T003 [P] Create tutorial step definitions array (`TUTORIAL_STEPS`) with element resolvers (`resolveTarget`), tooltip position hints, drawer requirements (`requiresDrawerOpen`), and demo node flags per step configuration table in contracts §3 in `src/utils/tutorialSteps.ts`
- [X] T004 [P] Create unit tests for `tutorialSteps` — step count (5), step order, message text matching FR-003, tooltip positions, `resolveTarget` returns expected elements (with mocked DOM), `requiresDrawerOpen` values, `requiresDemoNode` flags in `src/__tests__/tutorialSteps.test.ts`

---

## 1.3. Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hook and persistence logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement `useTutorial` hook with state machine (`isActive`, `currentStepIndex`, `targetRect`), step navigation (`next`/`dismiss`/`start`), `getBoundingClientRect()` measurement with retry logic (3 attempts, 100ms apart — skip step on failure per FR-017), viewport `resize`/`scroll` listener for `targetRect` recalculation (debounced at 100ms), and `activeView` change monitoring that dismisses the tutorial when the user navigates away from the Visual Designer (FR-015) in `src/hooks/useTutorial.ts`
- [X] T006 Implement localStorage persistence in `useTutorial` — load `TutorialPersistedState` from `frontier-flow:tutorial` on mount, save `hasSeenTutorial: true` on tutorial **start** (so mid-tutorial page refreshes count as "seen" per edge case §1.2.5) and on dismiss/finish (idempotent), handle missing/corrupt/version-mismatch data by resetting to defaults in `src/hooks/useTutorial.ts`
- [X] T007 Create unit tests for `useTutorial` hook — state transitions (start/next/dismiss), localStorage read/write/corrupt-data handling, persist-on-start behaviour, drawer expansion callbacks, demo node insertion/cleanup, resize handler debounce, view-change dismissal, `resolveTarget` retry + skip fallback in `src/__tests__/useTutorial.test.ts`

**Checkpoint**: `useTutorial` hook is complete and tested — returns `{ isActive, currentStep, currentStepIndex, totalSteps, targetRect, next, dismiss, start }`

---

## 1.4. Phase 3: User Story 1 — Step-by-Step Guided Walkthrough (Priority: P1) 🎯 MVP

**Goal**: 5-step guided walkthrough with spotlight overlay, tooltip card, Next/Dismiss buttons, and smooth transitions between steps

**Independent Test**: Trigger tutorial, advance through all 5 steps via Next, verify each step highlights the correct element with the correct message and dims the rest of the screen

### 1.4.1. Implementation for User Story 1

- [X] T008 [US1] Create `TutorialOverlay` component with spotlight `<div>` (CSS `box-shadow` technique at z-60), positioned/sized from `targetRect` prop, and overlay backdrop (fixed, full viewport) in `src/components/TutorialOverlay.tsx`
- [X] T009 [US1] Add tooltip card rendering inside `TutorialOverlay` — message text, "Next" button (or "Finish" on last step), "Dismiss" button, positioned adjacent to spotlight via `tooltipPosition` hint with viewport-aware flipping (12px gap, 8px viewport edge clamp), at z-61 in `src/components/TutorialOverlay.tsx`
- [X] T010 [US1] Add text-only step progress indicator ("Step N of 5") to the tooltip card in `src/components/TutorialOverlay.tsx`
- [X] T011 [US1] Implement tooltip fade transition — component-internal visibility state, CSS opacity/transform transitions (200ms ease) on step change per research §7.2 in `src/components/TutorialOverlay.tsx`
- [X] T012 [US1] Wire drawer expansion logic in `useTutorial` — when entering a step with `requiresDrawerOpen`, call `onExpandDrawer` callback before measuring target rect; handle `"sidebar"` (step 2) and `"contract-panel"` (step 4) in `src/hooks/useTutorial.ts`
- [X] T013 [US1] Wire demo node logic in `useTutorial` — when entering step 3 (socket), if canvas is empty call `onInsertDemoNode`; on advancing past step 3 or dismissing, call `onRemoveDemoNode`; use constant ID `"tutorial-demo-node"` in `src/hooks/useTutorial.ts`
- [X] T014 [US1] Mount `TutorialOverlay` in `App.tsx` — instantiate `useTutorial` with `isCanvasReady`, `activeView`, drawer/demo-node callbacks; pass return values as props to `<TutorialOverlay />` in `src/App.tsx`
- [X] T015 [US1] Add `onInsertDemoNode`/`onRemoveDemoNode` callback props to `CanvasWorkspaceProps`; inside `FlowEditor`, wire callbacks to `setNodes` for inserting/removing the demo node (ID `"tutorial-demo-node"`); pass callbacks up from `App.tsx` in `src/components/CanvasWorkspace.tsx` and `src/App.tsx`
- [X] T016 [US1] Add `ff-tutorial__target` CSS class application — in `useTutorial`, when a step is active, add `position: relative; z-index: 60` class to the resolved target element and remove it on step change or dismiss in `src/hooks/useTutorial.ts`
- [X] T017 [P] [US1] Create unit tests for `TutorialOverlay` — rendering when active/inactive, spotlight positioning from `targetRect`, tooltip positioning with flip logic, Next/Finish/Dismiss button callbacks, progress indicator text, tooltip fade transitions in `src/__tests__/TutorialOverlay.test.tsx`

**Checkpoint**: Full 5-step tutorial works when triggered manually and is unit-tested. Spotlight, tooltip, Next/Finish, Dismiss, smooth transitions, drawer expansion, demo node all functional.

---

## 1.5. Phase 4: User Story 2 — Tutorial Trigger and Auto-Start (Priority: P2)

**Goal**: Auto-start on first visit (after canvas ready + 500ms delay); manual restart via header "?" button; persist seen state so auto-start only fires once

**Independent Test**: Clear localStorage, reload → tutorial auto-starts. Dismiss, reload → no auto-start. Click "?" → tutorial restarts.

### 1.5.1. Implementation for User Story 2

- [X] T018 [US2] Implement auto-start logic in `useTutorial` — on mount, if `!hasSeenTutorial` and `isCanvasReady` and `activeView === "visual"`, start tutorial after 500ms `setTimeout`; cancel timer on unmount or if conditions change in `src/hooks/useTutorial.ts`
- [X] T019 [P] [US2] Add `onStartTutorial` prop to `HeaderProps` and render a "?" help button inside `HeaderActions` (before `WalletStatus`) with `aria-label="Start tutorial"`, `title="Start tutorial"`, class `ff-header__help-button` in `src/components/Header.tsx`
- [X] T020 [P] [US2] Add `ff-header__help-button` CSS styles — consistent with existing header button styling, hover/focus states matching design system in `src/index.css`
- [X] T021 [US2] Wire `onStartTutorial` callback from `App.tsx` to `useTutorial.start()` and pass it as prop to `<Header />` in `src/App.tsx`
- [X] T022 [US2] Update existing `Header.test.tsx` — add test case for "?" help button rendering and `onStartTutorial` callback in `src/__tests__/Header.test.tsx`

**Checkpoint**: Tutorial auto-starts for new users, persists seen state, can be re-triggered via header button, and header button is unit-tested.

---

## 1.6. Phase 5: User Story 3 — Accessible and Responsive Experience (Priority: P3)

**Goal**: Full keyboard navigation (Tab/Enter/Escape), focus trapping, screen reader announcements

**Independent Test**: Tab through tutorial with keyboard, verify focus cycling. Press Escape to dismiss. Resize viewport, verify tooltip repositions. Run screen reader, verify announcements.

### 1.6.1. Implementation for User Story 3

- [X] T023 [US3] Implement focus trapping in `TutorialOverlay` — on step mount focus tooltip panel ref; Tab/Shift+Tab cycles between Next and Dismiss; reuse `getFocusableElements` + `trapFocusWithinPanel` pattern from existing modals in `src/components/TutorialOverlay.tsx`
- [X] T024 [US3] Add Escape key handler in `TutorialOverlay` — keydown listener calls `onDismiss` on Escape key in `src/components/TutorialOverlay.tsx`
- [X] T025 [US3] Add ARIA attributes to `TutorialOverlay` — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to tooltip title; add `aria-live="polite"` region for step description announcements in `src/components/TutorialOverlay.tsx`
- [X] T026 [US3] Create unit tests for US3 accessibility additions — focus-trap cycling (Tab/Shift+Tab between Next and Dismiss), Escape key dismissal, ARIA attribute assertions (`role="dialog"`, `aria-modal`, `aria-live` region announces step text) in `src/__tests__/TutorialOverlay.test.tsx`

**Checkpoint**: Tutorial is fully keyboard-navigable and screen-reader-announced, with unit tests for all a11y behaviour. Viewport resize handling is covered by T005 in Phase 2.

---

## 1.7. Phase 6: User Story 4 — Step Progress Indication (Priority: P4)

**Goal**: Visual dot indicators alongside the existing "Step N of 5" text

**Independent Test**: Advance through each step and verify dot indicators highlight the current dot correctly.

### 1.7.1. Implementation for User Story 4

- [X] T027 [US4] Enhance progress indicator in tooltip card — add visual dot indicators (5 dots, current dot highlighted with `--brand-orange`) below the existing "Step N of 5" text from T010 in `src/components/TutorialOverlay.tsx`
- [X] T028 [US4] Add unit tests for dot indicators — correct dot count (5), current dot highlighted with `--brand-orange` class, dots update on step change, no Back button rendered in `src/__tests__/TutorialOverlay.test.tsx`

**Checkpoint**: Progress indicator with text and dots updates correctly at each step, with unit tests. Forward-only navigation (no Back button).

---

## 1.8. Phase 7: Integration & Validation

**Purpose**: E2E testing, performance validation, and manual QA across all stories

- [X] T029 Create Playwright E2E test — full 5-step walkthrough (start → Next × 4 → Finish), dismiss mid-tutorial, auto-start on first visit, no auto-start on revisit, manual restart via "?" button, keyboard navigation (Tab/Enter/Escape), `axe-core` accessibility audit during active tutorial in `tests/e2e/tutorial.spec.ts`
- [X] T030 Validate performance goal — measure step transition render time (target: < 16ms per step) using Playwright `performance.measure()` or React DevTools profiling; add assertion to E2E test suite in `tests/e2e/tutorial.spec.ts`
- [X] T031 Run `quickstart.md` validation — follow all manual testing steps in `specs/016-visual-designer-tutorial/quickstart.md` and verify they pass

---

## 1.9. Dependencies & Execution Order

### 1.9.1. Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001, T002, T003, T004 run in parallel.
- **Foundational (Phase 2)**: Depends on T001 (types) and T003 (step definitions). T007 depends on T005–T006. BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Phase 2 completion. Requires T002 (CSS) for visual correctness. T017 depends on T008–T011.
- **US2 (Phase 4)**: Depends on Phase 2 (auto-start logic) and T008–T009 (overlay rendering). T022 depends on T019.
- **US3 (Phase 5)**: Depends on T008–T009 (overlay component exists for adding a11y). T026 depends on T023–T025.
- **US4 (Phase 6)**: Depends on T009–T010 (tooltip card and text progress exist for adding dots). T028 depends on T027.
- **Integration (Phase 7)**: Depends on all story phases being complete.

### 1.9.2. User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No dependency on other stories. This is the MVP.
- **US2 (P2)**: Can start after Phase 2 + US1 overlay mount (T014). Header button (T019) is parallel with overlay.
- **US3 (P3)**: Can start after US1 overlay component exists (T008–T009). Independent of US2.
- **US4 (P4)**: Can start after US1 tooltip card exists (T009–T010). Independent of US2/US3.

### 1.9.3. Within Each User Story

- Overlay structure (T008) before tooltip content (T009–T011)
- Hook logic (T012–T013) before App wiring (T014–T015)
- CSS class application (T016) after hook is functional
- Unit tests after implementation tasks they cover

### 1.9.4. Parallel Opportunities

- **Phase 1**: T001, T002, T003, T004 — all different files, fully parallel
- **Phase 3 (US1)**: T008 + T012 + T013 can start in parallel (overlay vs hook logic)
- **Phase 4 (US2)**: T019 + T020 can run parallel with T018
- **Phase 5 (US3)**: T023 + T024 + T025 touch same file but are additive sections — sequential within file

### 1.9.5. Parallel Example: Phase 1 + Early Phase 2

```text
# All Phase 1 tasks in parallel (different files):
T001: src/types/tutorial.ts
T002: src/index.css
T003: src/utils/tutorialSteps.ts
T004: src/__tests__/tutorialSteps.test.ts

# Then Phase 2 (sequential hooks, then test):
T005: src/hooks/useTutorial.ts (state machine + resize + view-change)
T006: src/hooks/useTutorial.ts (persistence)
T007: src/__tests__/useTutorial.test.ts (depends on T005–T006)
```

---

## 1.10. Implementation Strategy

### 1.10.1. MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004) — all parallel
2. Complete Phase 2: Foundational (T005–T007) — sequential hooks, then tests
3. Complete Phase 3: US1 (T008–T017) — core walkthrough + tests
4. **STOP and VALIDATE**: Trigger tutorial manually, walk through all 5 steps
5. Deployable MVP — users can experience the full 5-step tutorial

### 1.10.2. Incremental Delivery

1. Setup + Foundational (with tests) → Foundation ready
2. Add US1 (with tests) → Test independently → **MVP deployed** (manual trigger only)
3. Add US2 (with tests) → Test independently → Auto-start + header button
4. Add US3 (with tests) → Test independently → Full accessibility
5. Add US4 (with tests) → Test independently → Progress dots
6. Integration & Validation → E2E + performance + quickstart validation

### 1.10.3. Parallel Team Strategy

With 2 developers after Phase 2 completion:

- **Developer A**: US1 (T008–T017) → US3 (T023–T026)
- **Developer B**: US2 (T018–T022) → US4 (T027–T028) → Integration (T029–T031)

---

## 1.11. Notes

- [P] tasks = different files, no dependencies — safe to run concurrently
- [Story] label maps task to specific user story for traceability
- Unit tests are co-located with their implementation phase (TDD per Constitution §VI)
- Viewport resize handling is consolidated in T005 (no separate task)
- Tooltip fade transitions (200ms ease) are component-internal to `TutorialOverlay`
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Demo node ID is always `"tutorial-demo-node"` — deterministic cleanup
- All CSS uses `ff-tutorial__*` BEM prefix — no class name collisions
- Z-index: overlay at z-60, tooltip at z-61, target highlight at z-60
