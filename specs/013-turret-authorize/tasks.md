# Tasks: Turret Extension Authorization

**Input**: Design documents from `/specs/013-turret-authorize/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/turret-graphql.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Shared domain types and constants used by all user stories

- [X] T001 Create authorization domain types (StoredDeploymentState, TurretInfo, TurretExtensionInfo, AuthorizationTarget, AuthorizationTurretStatus, DeploymentTargetId re-export) and constant AUTHORIZATION_CONFIRMATION_TIMEOUT_MS (30 000) in src/types/authorization.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Implement deployment state storage utilities (saveDeploymentState, loadDeploymentState, clearDeploymentState, validateDeploymentState with contractName + targetId stale detection) in src/utils/deploymentStateStorage.ts
- [X] T003 [P] Extend StoredPrimaryView in src/utils/uiStateStorage.ts and PrimaryView in src/components/Header.tsx to include "authorize" atomically so persisted and runtime view types stay aligned during incremental implementation

### Tests for Phase 2

- [X] T004 [P] Unit tests for deployment state storage (save/load round-trip, validate against current contract, stale contractName detection, stale targetId detection, version field check, corrupted JSON handling, clearDeploymentState) in src/**tests**/deploymentStateStorage.test.ts

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Persist Deployment State Across Reloads (Priority: P1) 🎯 MVP

**Goal**: After deploying a contract, persist the deployment result (package ID, target, digest, module name) to localStorage so the workflow survives page reloads.

**Independent Test**: Deploy a contract, reload the page, confirm the deployment state is restored and the Authorize tab is enabled.

### Tests for User Story 1

- [X] T005 [P] [US1] Unit tests for deployment state integration in useDeployment hook (state saved on successful deployment, state cleared on re-deployment, stale state discarded on load) in src/**tests**/useDeployment.test.ts (extend existing test file if present, else create)

### Implementation for User Story 1

- [X] T006 [US1] Modify useDeployment hook to call saveDeploymentState on successful deployment and clearDeploymentState when starting a new deployment in src/hooks/useDeployment.ts
- [X] T007 [US1] Add deployment state loading on app startup in src/App.tsx: load and validate StoredDeploymentState, discard if stale, fall back activeView from "authorize" to "visual" when no valid deployment state exists, and expose deployment state to child components

**Checkpoint**: Deployment state persists across reloads. Reloading after deployment restores the correct package ID, target, and digest.

---

## Phase 4: User Story 2 — Authorize Tab in Header Navigation (Priority: P1)

**Goal**: A third "Authorize" tab appears in the header, disabled until a contract is deployed, then clickable to switch to the Authorize view.

**Independent Test**: Deploy a contract and confirm the Authorize tab transitions from disabled to enabled; click it and verify the Authorize view renders.

**⚠️ NavigationButton Extension Required**: The existing `NavigationButton` component in Header.tsx only accepts `active`, `icon`, `label`, `onClick` props. It must be extended with `disabled?: boolean` and `tooltip?: string` props to support the disabled-with-tooltip state required by FR-006. The `<button>` element must set `disabled` and `aria-disabled` attributes; the tooltip must use `title` attribute and be visible on hover even when disabled.

### Tests for User Story 2

- [X] T008 [P] [US2] Component tests for Header with Authorize tab (renders three tabs, Authorize tab disabled when no deployment, enabled when deployment exists, tooltip on disabled state, click triggers view change) in src/**tests**/Header.test.tsx (extend existing test file if present, else create)

### Implementation for User Story 2

- [X] T009 [P] [US2] Extend NavigationButton with `disabled` and `tooltip` props and add third NavigationButton for Authorize tab with shield/key icon (inline SVG, 18×14 viewport), disabled state gated on deployment existence in src/components/Header.tsx
- [X] T010 [P] [US2] Create placeholder AuthorizeView component that renders feature heading and "select turrets to authorize" placeholder content in src/components/AuthorizeView.tsx
- [X] T011 [US2] Add authorize view routing branch in AppMainContent — render AuthorizeView when activeView is "authorize" and pass deployment state as props in src/App.tsx

**Checkpoint**: Authorize tab visible, disabled when no deployment, enabled after deployment, switches to the Authorize view on click.

---

## Phase 5: User Story 3 — View and Select Turrets for Authorization (Priority: P1)

**Goal**: Authorize tab fetches owned turrets via GraphQL and displays them as selectable checkboxes with extension status badges.

**Independent Test**: Connect a wallet with turrets on a testnet, open the Authorize tab, confirm all owned turrets are listed with correct extension status and selectable checkboxes.

### Tests for User Story 3

- [X] T012 [P] [US3] Unit tests for turret query and response parsing (successful response with turrets, empty turret list, GraphQL error response, malformed response, network failure, abort signal handling) in src/**tests**/turretQueries.test.ts
- [X] T013 [P] [US3] Hook tests for useTurretList (loading to success, loading to error, retry refetch, abort on unmount, refresh after target change) in src/**tests**/useTurretList.test.ts

### Implementation for User Story 3

- [X] T014 [P] [US3] Create GraphQL turret query function (fetchTurrets) and response parser (parseTurretResponse) with target-aware endpoint routing via DeploymentTargetId, AbortSignal support, and TurretInfo[] output in src/utils/turretQueries.ts
- [X] T015 [P] [US3] Create AuthorizeTurretItem component with custom checkbox (label + hidden input + custom indicator — built from scratch following sci-fi design aesthetic per R5, no border-radius, CSS variables) and extension badge showing current extension or "no extension" in src/components/AuthorizeTurretItem.tsx
- [X] T016 [US3] Create useTurretList hook wrapping fetchTurrets with loading/error/success states, retry capability, and automatic fetch on mount and manual refresh in src/hooks/useTurretList.ts
- [X] T017 [US3] Create AuthorizeTurretList component with select-all toggle, per-turret checkboxes via AuthorizeTurretItem, already-authorized turrets pre-checked and disabled, selection state management in src/components/AuthorizeTurretList.tsx
- [X] T018 [US3] Implement full AuthorizeView with loading spinner, error state with retry button, empty state ("No turrets found"), turret list with selection, and "Authorize Selected" button (disabled when no selection) in src/components/AuthorizeView.tsx
- [X] T019 [P] [US3] Add authorize view styles (turret list layout, turret item with checkbox indicator, extension badge, selected state, disabled/already-authorized state, loading/error/empty states, Authorize button) in src/index.css

### Tests for User Story 3 (Component)

- [X] T020 [P] [US3] Component tests for AuthorizeView turret list (loading state renders spinner, error state renders retry, empty state renders message, turret list renders items, checkbox selection toggles, already-authorized turrets disabled) in src/**tests**/AuthorizeView.test.tsx

**Checkpoint**: Turrets load from GraphQL, display with extension badges, checkboxes work, loading/error/empty states render correctly.

---

## Phase 6: User Story 4 — Authorize Extension on Selected Turrets (Priority: P1)

**Goal**: Submit sequential authorization transactions for each selected turret (borrow OwnerCap → authorize_extension → return OwnerCap) with a progress modal tracking per-turret status. Includes baseline transaction confirmation via `waitForTransaction` with configurable timeout per FR-018 (confirmed only after on-chain confirmation, not optimistically) and FR-023 (timeout warning state after AUTHORIZATION_CONFIRMATION_TIMEOUT_MS). Wallet disconnection handling per FR-021 (pause authorization, show reconnection prompt, resume on reconnect).

**Independent Test**: Select turrets, confirm authorization, verify on-chain transactions are submitted and the progress dialog tracks each turret's status through pending → submitting → confirming → confirmed/failed. Verify wallet disconnection pauses the process and shows a reconnection prompt.

### Tests for User Story 4

- [ ] T021 [P] [US4] Unit tests for authorization transaction construction (valid transaction with correct Move calls, missing OwnerCap error, malformed turret ID, correct type arguments for auth witness) in src/**tests**/authorizationTransaction.test.ts
- [ ] T022 [P] [US4] Component tests for AuthorizationProgressModal (renders pending turrets, transitions to submitting/confirming/confirmed/failed, confirmation timeout shows warning state, summary counts correct, wallet disconnection warning renders, close button triggers callback) in src/**tests**/AuthorizationProgressModal.test.tsx

### Implementation for User Story 4

- [ ] T023 [P] [US4] Create buildAuthorizeTurretTransaction function (constructs Transaction with borrow_owner_cap → authorize_extension → return_owner_cap) and fetchOwnerCap GraphQL query (resolves `OwnerCap<Turret>` by owner address) in src/utils/authorizationTransaction.ts
- [ ] T024 [US4] Create useAuthorization hook for sequential per-turret execution with: status tracking (pending → submitting → confirming → confirmed/failed/warning), baseline waitForTransaction confirmation with AUTHORIZATION_CONFIRMATION_TIMEOUT_MS timeout (FR-018: only mark confirmed after on-chain confirmation; FR-023: transition to warning state on timeout), wallet disconnection detection with pause/resume (FR-021), continue-on-failure for remaining turrets (FR-019), and completion summary in src/hooks/useAuthorization.ts
- [ ] T025 [US4] Create AuthorizationProgressModal with per-turret status rows (pending/submitting/confirming/confirmed/failed/warning icons and labels), timeout warning state with "check your wallet" guidance, wallet disconnected overlay with reconnection prompt, completion summary (success/failed counts), and close button; modelled after DeploymentProgressModal visual patterns (backdrop, panel, focus trap, aria-live regions) in src/components/AuthorizationProgressModal.tsx
- [ ] T026 [US4] Wire authorization flow into AuthorizeView: "Authorize Selected" button triggers useAuthorization, opens AuthorizationProgressModal, post-close refreshes turret list to reflect updated extension state in src/components/AuthorizeView.tsx

**Checkpoint**: Full authorization flow works end-to-end — select turrets, click Authorize, sign transactions, see per-turret progress with on-chain confirmation (not optimistic), timeout warning states, wallet disconnection pause/resume, view summary. All P1 MUST requirements (FR-015 through FR-023) fulfilled.

---

## Phase 7: User Story 5 — Event-Driven Confirmation of Authorization (Priority: P2)

**Goal**: Enhance confirmation by listening for on-chain authorization events instead of relying solely on `waitForTransaction`. A turret is only green-ticked once the authorization event is observed, providing higher confidence on congested networks.

**Independent Test**: Submit an authorization transaction, observe that the UI distinguishes between transaction confirmation and event observation; verify timeout warning appears if event is delayed beyond AUTHORIZATION_CONFIRMATION_TIMEOUT_MS.

### Tests for User Story 5

- [ ] T027 [P] [US5] Unit tests for event-driven confirmation (event received transitions to confirmed, event timeout transitions to warning, retry after timeout re-checks for event) in src/**tests**/useAuthorization.test.ts

### Implementation for User Story 5

- [ ] T028 [US5] Add event-driven confirmation layer to useAuthorization: after waitForTransaction confirms, subscribe/poll for authorization event on-chain; only transition to "confirmed" when event is observed; transition to "warning" on event timeout with retry option in src/hooks/useAuthorization.ts
- [ ] T029 [US5] Add confirming-to-event visual state in AuthorizationProgressModal: distinguish "transaction confirmed, awaiting event" from "transaction submitted"; add retry button on warning state in src/components/AuthorizationProgressModal.tsx

**Checkpoint**: Turrets show "confirming" state while awaiting events, transition to "confirmed" on event receipt, show "warning" on timeout with retry.

---

## Phase 8: Integration Tests & Polish

**Purpose**: End-to-end validation, cross-cutting edge cases, and final polish

- [ ] T030 [P] E2E test for full authorization workflow (deploy → authorize tab enabled → select turrets → authorize → verify per-turret confirmations → close and verify list refresh) using msw for GraphQL mocking and wallet simulation in tests/e2e/authorize.spec.ts
- [ ] T031 [P] Add extension replacement warning for turrets with a different existing extension — show inline warning text "This will replace the current extension" when checkbox is toggled, per Edge Case from spec.md in src/components/AuthorizeTurretItem.tsx
- [ ] T032 [P] Handle deployment target switching while on Authorize tab — clear turret list, re-fetch for new target, cancel any in-progress authorization per spec edge case in src/components/AuthorizeView.tsx
- [ ] T033 Run quickstart.md end-to-end validation — follow all 5 steps in quickstart.md manually, verify each checkpoint passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (needs deploymentStateStorage.ts)
- **US2 (Phase 4)**: Depends on Phase 2 (needs extended PrimaryView) + Phase 3 (needs deployment state to gate tab)
- **US3 (Phase 5)**: Depends on Phase 4 (needs AuthorizeView routing)
- **US4 (Phase 6)**: Depends on Phase 5 (needs turret list and selection)
- **US5 (Phase 7)**: Depends on Phase 6 (enhances authorization hook and modal)
- **Integration & Polish (Phase 8)**: Depends on Phase 6 at minimum; can overlap with Phase 7

### User Story Dependencies

- **US1** (Persist Deployment State): Foundation only — no other story dependencies
- **US2** (Authorize Tab): Depends on US1 — deployment state gates the tab
- **US3** (View and Select Turrets): Depends on US2 — needs the Authorize view to exist
- **US4** (Authorization Execution): Depends on US3 — needs turret selection
- **US5** (Event-Driven Confirmation): Depends on US4 — enhances the authorization flow

### Within Each Phase

- Setup → Foundational → User stories in sequence (US1 → US2 → US3 → US4 → US5)
- [P] tasks within a phase can run in parallel
- Non-[P] tasks execute in listed order
- Test tasks are written FIRST within each phase (TDD per Constitution Principle VI), verified to fail, then implementation tasks follow

### Parallel Opportunities

Within Phase 2: T002, T003, T004 (different files, no dependencies)
Within Phase 3: T005 can start immediately (test-first); T006, T007 sequential after T005
Within Phase 4: T008, T009, T010 (different files); T011 after T009/T010
Within Phase 5: T012, T013, T014, T015, T019 (different files); T016 after T014; T017 after T015/T016; T018 after T017; T020 after T018
Within Phase 6: T021, T022, T023 (different files); T024 after T023; T025 after T024; T026 after T025
Within Phase 7: T027 first (test-first); T028 after T027; T029 after T028
Within Phase 8: T030, T031, T032 (different files); T033 last

---

## Parallel Example: User Story 3

```text
# Batch 1 — tests first + independent implementation files (no cross-deps):
T012: Unit tests for turretQueries.ts (test-first, should fail)
T013: Hook tests for useTurretList.ts (test-first, should fail)
T014: Create turretQueries.ts
T015: Create AuthorizeTurretItem.tsx
T019: Add authorize styles in index.css

# Batch 2 — sequential (depends on T014):
T016: Create useTurretList.ts

# Batch 3 — sequential (depends on T015, T016):
T017: Create AuthorizeTurretList.tsx

# Batch 4 — sequential (depends on T017):
T018: Implement full AuthorizeView.tsx

# Batch 5 — component tests (depends on T018):
T020: Component tests for AuthorizeView
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003, T004)
3. Complete Phase 3: User Story 1 (T005, T006, T007)
4. **STOP and VALIDATE**: Verify deployment state persists across reloads

### Incremental Delivery

1. Setup + Foundational → Types, utilities, and foundation tests ready
2. Add US1 → Deployment state persists → Foundation for everything
3. Add US2 → Authorize tab visible and routing works
4. Add US3 → Turret list loads and selection works → Validate independently
5. Add US4 → Full authorization flow with on-chain confirmation, timeout warning, wallet disconnection handling → All MUST requirements fulfilled
6. Add US5 → Event-driven confirmation enhancement (P2 — higher confidence on congested networks)
7. Integration & Polish → E2E tests, extension replacement warnings, target switching, quickstart validation

### Suggested MVP Scope

The practical MVP is US1 through US4 (Phases 1–6, tasks T001–T026). This delivers the complete authorize workflow: persist deployment → navigate to tab → select turrets → authorize on-chain with on-chain confirmation (FR-018), confirmation timeout warning (FR-023), wallet disconnection handling (FR-021), and continue-on-failure (FR-019). All MUST requirements are fulfilled at this point.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps task to a specific user story for traceability
- Each user story builds on the previous one (linear dependency chain for this feature)
- Test tasks are included per Constitution Principle VI (Test-First Quality is mandatory for all new features)
- FR-018 (on-chain confirmation before green tick) and FR-023 (confirmation timeout warning) are MUST requirements — placed in US4 mandatory scope, not deferred to US5 or Polish
- FR-021 (wallet disconnection handling) is a MUST requirement — placed in US4, not deferred to Polish
- NavigationButton in Header.tsx requires extension with `disabled` and `tooltip` props (currently only supports `active`, `icon`, `label`, `onClick`)
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
