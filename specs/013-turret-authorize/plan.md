# Implementation Plan: Turret Extension Authorization

**Branch**: `013-turret-authorize` | **Date**: 2026-03-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-turret-authorize/spec.md`

## Summary

Add a turret extension authorization workflow to Frontier Flow. After deploying a compiled smart contract, users access a new "Authorize" tab (alongside Visual and Move) to select owned turrets via GraphQL queries and authorize the deployed extension on each turret on-chain. Deployment state (package ID, target, digest) is persisted in local storage so the workflow survives reloads. Authorization progress is tracked per-turret in a modal dialog with event-driven confirmation.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES Modules)
**Primary Dependencies**: React 19, Tailwind CSS 4, @mysten/sui (Sui SDK), @mysten/dapp-kit (wallet integration), @xyflow/react (canvas — not directly used by this feature)
**Storage**: localStorage — `frontier-flow:ui-state` (view state), `frontier-flow:contracts` (contract library), new key `frontier-flow:deployment` (deployment state persistence)
**Testing**: Vitest + @testing-library/react (unit/component), Playwright (E2E), msw (GraphQL/network mocking)
**Target Platform**: Browser (Vite SPA)
**Project Type**: Web application (single-page React app)
**Performance Goals**: Turret list loads within 3 seconds; authorization per-turret under 30 seconds excluding wallet signing
**Constraints**: Sequential transaction processing (one turret at a time); GraphQL endpoint rate limits; wallet must stay connected during authorization
**Scale/Scope**: Typical user owns 1–20 turrets; must handle 50+ gracefully with scrolling

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                    | Status | Evidence                                                                                                                                                     |
| --- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I   | Type Safety Above All        | PASS   | All new types use discriminated unions (AuthorizationTurretStatus), no `any`, strict TypeScript                                                              |
| II  | Visual Feedback is Paramount | PASS   | Per-turret status indicators (pending → submitting → confirming → confirmed/failed), progress dialog, disabled tab state with tooltip                        |
| III | Domain-Driven Design         | PASS   | Components map directly to game domain: Turret, OwnerCap, authorize_extension. UI speaks EVE Frontier language                                               |
| IV  | Predictable Code Generation  | N/A    | Feature does not modify code generation pipeline                                                                                                             |
| V   | Security by Default          | PASS   | No secrets logged; GraphQL responses validated; wallet signing handled by dApp-kit (no raw key access); XSS prevented by React escaping                      |
| VI  | Test-First Quality           | PASS   | Plan includes unit tests for all utilities, component tests for UI, E2E for full workflow. msw for GraphQL mocking                                           |
| VII | Accessibility & Inclusion    | PASS   | Authorize tab uses aria-current, tooltip on disabled state, turret list uses semantic checkboxes with labels, progress modal has focus trap and live regions |

**Gate Result**: PASS — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/013-turret-authorize/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── turret-graphql.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── Header.tsx                         # Modified: PrimaryView extended, Authorize tab added
│   ├── AuthorizeView.tsx                  # New: main authorize view with turret list
│   ├── AuthorizeTurretList.tsx            # New: turret selection list with checkboxes
│   ├── AuthorizeTurretItem.tsx            # New: individual turret row with checkbox + extension badge
│   └── AuthorizationProgressModal.tsx     # New: per-turret progress dialog
├── hooks/
│   ├── useDeployment.ts                   # Modified: deployment state persistence
│   ├── useTurretList.ts                   # New: GraphQL turret fetching + caching
│   └── useAuthorization.ts                # New: sequential authorization execution
├── utils/
│   ├── uiStateStorage.ts                  # Modified: StoredPrimaryView extended with "authorize"
│   ├── deploymentStateStorage.ts          # New: deployment state localStorage persistence
│   ├── turretQueries.ts                   # New: GraphQL queries for turret objects
│   └── authorizationTransaction.ts        # New: Sui transaction construction for authorize_extension
├── types/
│   └── authorization.ts                   # New: turret & authorization domain types
├── __tests__/
│   ├── deploymentStateStorage.test.ts     # New
│   ├── turretQueries.test.ts              # New
│   ├── authorizationTransaction.test.ts   # New
│   ├── AuthorizeView.test.tsx             # New
│   └── AuthorizationProgressModal.test.tsx # New
├── App.tsx                                # Modified: authorize view routing
└── index.css                              # Modified: authorize-specific styles

tests/
└── e2e/
    └── authorize.spec.ts                  # New: E2E authorization workflow
```

**Structure Decision**: Follows existing single-project layout. New files placed alongside existing patterns — components in `src/components/`, hooks in `src/hooks/`, utilities in `src/utils/`, types in `src/types/`. No new directories needed.

## Complexity Tracking

No constitution violations to justify. Feature follows all existing patterns.
