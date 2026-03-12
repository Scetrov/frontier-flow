# Implementation Plan: Sign In with Sui Wallet

**Branch**: `003-sui-wallet-connect` | **Date**: 2026-03-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-sui-wallet-connect/spec.md`

## Summary

Add Sui wallet connection to Frontier Flow via `@mysten/dapp-kit`. The Header component gains a Connect/Disconnect button, truncated wallet address display, and live SUI balance — all styled to the existing dark sci-fi design system. The `@mysten/dapp-kit` providers (`SuiClientProvider`, `WalletProvider`) wrap the application at the root level, providing wallet state via React hooks. Auto-reconnect on page reload is handled by the dapp-kit's built-in `autoConnect` option.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES2022, ES Modules), React 19  
**Primary Dependencies**: `@mysten/dapp-kit` (wallet UI, hooks, providers), `@mysten/sui` (SUI client, balance queries), `@tanstack/react-query` (dapp-kit peer dependency)  
**Storage**: N/A (wallet session persisted by dapp-kit adapter internally via localStorage)  
**Testing**: Vitest + @testing-library/react (unit), Playwright (E2E)  
**Target Platform**: Browser (Chrome, Firefox, Edge — Sui wallet extensions required)  
**Project Type**: Web application (single-page React app)  
**Performance Goals**: Balance visible within 2s of connection; disconnect UI revert < 1s  
**Constraints**: No border-radius globally; dark theme only (MVP); WCAG 2.1 AA compliance  
**Scale/Scope**: Single Header component modification + root-level provider wiring; 3 new files maximum

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Type Safety Above All** | PASS | All wallet state typed via dapp-kit's exported types (`WalletAccount`). No `any`. Balance conversion uses typed MIST→SUI arithmetic. |
| **II. Visual Feedback is Paramount** | PASS | Connect/Disconnect button state change provides immediate feedback. Balance and address appear on connection. Loading states for balance fetch. |
| **III. Domain-Driven Design** | PASS | Wallet connection maps directly to HLD §1.2 "Sui Wallet" capability. Component structure follows existing `Header.tsx` pattern. |
| **IV. Predictable Code Generation** | N/A | This feature does not touch code generation. |
| **V. Security by Default** | PASS | No secrets stored. Wallet addresses are public data. Connection state managed by trusted dapp-kit library. Address display uses React's built-in escaping. |
| **VI. Test-First Quality** | PASS | Unit tests for WalletStatus component (connect/disconnect states, address truncation, balance formatting). E2E tests for connection flow with mocked wallet. |
| **VII. Accessibility & Inclusion** | PASS | Button has accessible labels. Wallet info uses semantic HTML. `:focus-visible` inherited from global styles. ARIA attributes for dynamic balance region. |

**Gate result**: All applicable principles PASS. No violations to justify.

**Post-design re-evaluation** (after Phase 1): All gates remain PASS. The data model uses dapp-kit's exported `WalletAccount` type (Principle I), state transitions provide immediate visual feedback (Principle II), component boundaries align with HLD domain model (Principle III), no secrets are stored and React escaping prevents XSS (Principle V), implementation order is test-first (Principle VI), and ARIA live regions are specified for dynamic wallet info (Principle VII).

## Project Structure

### Documentation (this feature)

```text
specs/003-sui-wallet-connect/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main.tsx                      # MODIFY: Wrap App with Sui providers
├── App.tsx                       # No changes needed
├── components/
│   ├── Header.tsx                # MODIFY: Add WalletStatus to right side
│   └── WalletStatus.tsx          # NEW: Connect/Disconnect button + address + balance
├── utils/
│   └── formatAddress.ts          # NEW: Address truncation utility
├── __tests__/
│   ├── Header.test.tsx           # MODIFY: Update for wallet integration
│   ├── WalletStatus.test.tsx     # NEW: Unit tests for wallet component
│   └── formatAddress.test.ts     # NEW: Unit tests for address formatting
tests/
└── e2e/
    └── wallet.spec.ts            # NEW: E2E tests for wallet connection flow
```

**Structure Decision**: This feature adds to the existing flat `src/components/` and `src/utils/` structure. No new directories needed. The `WalletStatus` component is a child of `Header`, keeping the component hierarchy shallow per the solution design.

## Complexity Tracking

No constitution violations — table not needed.
