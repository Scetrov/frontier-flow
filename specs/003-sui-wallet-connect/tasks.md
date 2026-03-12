# Tasks: Sign In with Sui Wallet

**Input**: Design documents from `/specs/003-sui-wallet-connect/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Test tasks are included because the implementation plan explicitly requires Vitest and Playwright coverage for wallet connection, wallet display, disconnect, and persistence flows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the wallet dependencies required by all wallet stories.

- [x] T001 Add `@mysten/dapp-kit`, `@mysten/sui`, and `@tanstack/react-query` dependencies in package.json and bun.lock

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the root provider stack that every wallet story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Update src/main.tsx to import `@mysten/dapp-kit/dist/index.css`, create the shared query/network configuration, and wrap `<App />` with `QueryClientProvider` and `SuiClientProvider`

**Checkpoint**: Wallet dependencies and provider scaffolding are ready, so story work can begin.

---

## Phase 3: User Story 1 - Connect Sui Wallet (Priority: P1) 🎯 MVP

**Goal**: Users can open the wallet flow from the header, connect a supported wallet, and receive clear guidance when no wallet is available.

**Independent Test**: Open the app, verify the "Connect" button is visible in the header, trigger the wallet flow, and confirm successful connection or the no-wallet guidance state without relying on other story-specific polish.

### Tests for User Story 1

- [x] T003 [P] [US1] Create wallet connection component tests in src/__tests__/WalletStatus.test.tsx covering disconnected CTA rendering, wallet selection trigger behaviour, rejected connection fallback, and no-wallet guidance
- [x] T004 [P] [US1] Update src/__tests__/Header.test.tsx to verify the header banner renders the wallet action area alongside existing branding content

### Implementation for User Story 1

- [x] T005 [US1] Create src/components/WalletStatus.tsx with the connect button, wallet selection trigger, and user-friendly no-wallet guidance using dapp-kit hooks
- [x] T006 [US1] Update src/components/Header.tsx to place `WalletStatus` in the top-right header layout while preserving the current responsive branding behaviour

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - View Wallet Information (Priority: P1)

**Goal**: Connected users can see a truncated wallet address and correctly formatted SUI balance in the header.

**Independent Test**: Connect a wallet and verify the header shows the truncated address, a formatted SUI balance, a zero-balance state, and a graceful balance fallback when the balance request fails.

### Tests for User Story 2

- [x] T007 [P] [US2] Create address-formatting unit tests in src/__tests__/formatAddress.test.ts covering truncation, `0x`-prefixed addresses, and short-address guard cases
- [x] T008 [P] [US2] Extend src/__tests__/WalletStatus.test.tsx to cover connected address rendering, non-zero and zero SUI balances, and the `— SUI` fallback state on balance errors

### Implementation for User Story 2

- [x] T009 [P] [US2] Create src/utils/formatAddress.ts with deterministic Sui address truncation logic for header display
- [x] T010 [US2] Update src/components/WalletStatus.tsx to render the truncated address, formatted SUI balance, and an `aria-live` status region for balance refresh and fallback messaging

**Checkpoint**: User Story 2 is fully functional and testable on its own.

---

## Phase 5: User Story 3 - Disconnect Wallet (Priority: P2)

**Goal**: Connected users can disconnect cleanly and immediately return the header to the disconnected state.

**Independent Test**: Connect a wallet, click "Disconnect", and confirm the address and balance disappear while the header returns to the "Connect" action.

### Tests for User Story 3

- [x] T011 [P] [US3] Extend src/__tests__/WalletStatus.test.tsx to cover disconnect behaviour, removal of wallet info, and readiness to start a fresh connection flow

### Implementation for User Story 3

- [x] T012 [US3] Update src/components/WalletStatus.tsx to wire `useDisconnectWallet` and restore the disconnected header UI immediately after sign-out

**Checkpoint**: User Story 3 is fully functional and testable on its own.

---

## Phase 6: User Story 4 - Persistent Connection Across Page Reloads (Priority: P3)

**Goal**: Previously connected users are restored automatically on reload, while unavailable wallets fall back safely to the disconnected state.

**Independent Test**: Render the wallet UI with a pre-restored account and verify the header shows the connected state on first paint; then confirm unavailable-wallet conditions fall back to "Connect" without stale address or balance data.

### Tests for User Story 4

- [x] T013 [P] [US4] Extend src/__tests__/WalletStatus.test.tsx to cover restored-account rendering on initial mount and unavailable-wallet fallback after a reload-like restore
- [x] T014 [P] [US4] Create wallet end-to-end coverage in tests/e2e/wallet.spec.ts for the default disconnected header state and the no-wallet guidance flow in a browser without wallet extensions

### Implementation for User Story 4

- [x] T015 [US4] Update src/main.tsx to enable `WalletProvider` with `autoConnect` on the shared provider stack
- [x] T016 [US4] Update src/components/WalletStatus.tsx to react to auto-restored sessions and wallet availability changes without leaving stale UI in the header

**Checkpoint**: User Story 4 is fully functional and testable on its own.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation and validate the complete feature across automated and manual checks.

- [x] T017 [P] Update specs/003-sui-wallet-connect/quickstart.md with final commands and manual QA notes for connect, disconnect, fallback, and reload validation
- [x] T018 [P] Run `bun run test:run` and `bun run test:e2e` to validate src/__tests__/WalletStatus.test.tsx, src/__tests__/Header.test.tsx, src/__tests__/formatAddress.test.ts, and tests/e2e/wallet.spec.ts
- [x] T019 [P] Run `bun run lint`, `bun run typecheck`, and `bun run build` to confirm the wallet feature is production-ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies and can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories until the root providers exist in src/main.tsx
- **US1 (Phase 3)**: Depends on Foundational and is the recommended MVP
- **US2 (Phase 4)**: Depends on Foundational and builds on the connected-state UI established in US1
- **US3 (Phase 5)**: Depends on US1 and US2 because disconnect reuses the connected wallet state and displayed wallet information
- **US4 (Phase 6)**: Depends on Foundational and the wallet status UI from earlier stories so restored sessions render correctly in the same header surface
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start as soon as the provider stack exists in src/main.tsx
- **US2 (P1)**: Requires the wallet connection surface from US1 and adds address/balance presentation
- **US3 (P2)**: Requires the connected wallet UI from US1 and US2
- **US4 (P3)**: Requires the provider stack plus the connected/disconnected rendering established by the earlier stories

### Within Each User Story

- Write the story test tasks first and ensure they fail before implementation
- Add or update pure utilities before wiring them into UI components
- Finish component wiring after the underlying hooks and formatting logic are in place
- Validate the story independently at its checkpoint before moving on

### Parallel Opportunities

- T003 and T004 can run in parallel because they cover separate test files for US1
- T007 and T008 can run in parallel because utility and component coverage are in separate files for US2
- T009 can run in parallel with T008 once the expected formatting behaviour is agreed
- T013 and T014 can run in parallel because unit and end-to-end coverage are separate files for US4
- T017, T018, and T019 can run in parallel during polish if implementation is complete

---

## Parallel Example: User Story 1

```text
Task T003: "Create wallet connection component tests in src/__tests__/WalletStatus.test.tsx"
Task T004: "Update src/__tests__/Header.test.tsx to verify the wallet action area"
```

## Parallel Example: User Story 2

```text
Task T007: "Create address-formatting unit tests in src/__tests__/formatAddress.test.ts"
Task T008: "Extend src/__tests__/WalletStatus.test.tsx for address and balance states"
Task T009: "Create src/utils/formatAddress.ts with deterministic truncation logic"
```

## Parallel Example: User Story 4

```text
Task T013: "Extend src/__tests__/WalletStatus.test.tsx for restored-account coverage"
Task T014: "Create wallet end-to-end coverage in tests/e2e/wallet.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: User Story 1 (T003-T006)
4. **STOP and VALIDATE**: Confirm wallet connection and no-wallet guidance work from the header

### Incremental Delivery

1. Deliver Setup + Foundational to establish the provider stack and wallet dependencies
2. Deliver US1 so users can initiate wallet connection from the header
3. Deliver US2 so connected users can see address and balance details
4. Deliver US3 so users can disconnect cleanly
5. Deliver US4 so prior sessions restore automatically on reload
6. Finish with Polish to validate docs, tests, lint, type-check, and build

---

## Notes

- [P] tasks touch separate files or can be executed independently after prerequisites are satisfied
- No contracts phase is included because this feature exposes no new API, CLI, or backend interface
- The task list stays within the planned surface area: src/main.tsx, src/components/Header.tsx, src/components/WalletStatus.tsx, src/utils/formatAddress.ts, related tests, and specs/003-sui-wallet-connect/quickstart.md