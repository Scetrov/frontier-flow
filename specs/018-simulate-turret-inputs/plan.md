# 1. Implementation Plan: Turret Input Simulation

**Branch**: `018-simulate-turret-inputs` | **Date**: 2026-03-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-simulate-turret-inputs/spec.md`

## 1.1. Summary

Add a row-level simulation action to the existing Authorize workflow so an operator can open a modal for a specific turret, review a mostly prefilled target-candidate input draft, autocomplete identity fields from remote world data, and execute a non-mutating simulation against the deployed extension. The feature will reuse the published deployment context, turret discovery, and owner-cap/character lookup paths that already power authorization, then run the same runtime call path proven by `scripts/debug-turret-priority-mcve.ts`: `world::turret::verify_online` followed by `<package>::<module>::get_target_priority_list` via `devInspectTransactionBlock`. Candidate inputs and returned priority results will be encoded and decoded with the fixed BCS field order already documented for `TargetCandidateArg` and `ReturnTargetPriorityList`.

## 1.2. Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES Modules)
**Primary Dependencies**: React 19, Tailwind CSS 4, `@mysten/sui` (`bcs`, `jsonRpc`, `transactions`), `@mysten/dapp-kit`, existing authorization/turret GraphQL utilities
**Storage**: In-memory modal and form state only; reads existing `StoredDeploymentState` and existing UI/deployment local storage records, but does not add durable storage
**Testing**: Vitest + Testing Library for utility/component coverage, Playwright + MSW-backed network mocking for authorize-tab workflow coverage
**Target Platform**: Browser-based Vite SPA against published Sui testnet targets and local development mocks
**Project Type**: Web application (single-page React app)
**Performance Goals**: Modal open from row action feels immediate; autocomplete requests debounce and resolve within about 1 second on healthy network; a simulation run returns or fails with actionable feedback within about 5 seconds in the common case
**Constraints**: Simulation must remain non-mutating; published targets only; BCS field ordering must stay aligned with emitted Move contracts and `docs/OUTSTANDING-QUESTIONS.md`; partial GraphQL data must not block manual entry; stale turret/deployment context must block reruns until refreshed
**Scale/Scope**: One active modal for one selected turret at a time, repeated reruns for edited candidate drafts, suggestion lists capped to a small readable set, common wallet ownership of 1 to 20 turrets

## 1.3. Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Principle | Status | Evidence |
| --- | --- | --- | --- |
| I | Type Safety Above All | PASS | The design introduces explicit simulation domain types for modal state, candidate drafts, suggestion sources, and result decoding. BCS encoding and GraphQL parsing stay in typed utilities with no `any`. |
| II | Visual Feedback is Paramount | PASS | The row action, modal loading states, field source indicators, autocomplete states, stale-context banners, and result/error panes all provide immediate feedback without leaving the Authorize tab. |
| III | Domain-Driven Design | PASS | The feature is expressed in turret, deployment, owner character, target candidate, and priority result terms that match the game and the existing Authorize language. |
| IV | Predictable Code Generation | PASS | No generator behavior changes are required, but simulation explicitly reuses the stable deployed extension signature and the fixed `TargetCandidateArg` / `ReturnTargetPriorityList` BCS contract already enforced by generated Move. |
| V | Security by Default | PASS | The workflow is dev-inspect only, validates Sui ids and numeric ranges before execution, surfaces remote errors safely, and avoids any wallet signing or state mutation path. |
| VI | Test-First Quality | PASS | The plan includes codec, execution, query, component, and E2E coverage for success, empty-result, stale-context, and failure paths. |
| VII | Accessibility & Inclusion | PASS | The modal follows existing dialog patterns, row actions remain keyboard reachable, field provenance is text-labelled instead of color-only, and result/error regions are screen-reader friendly. |
| VIII | Durability & Maintainability | PASS | The feature extends the existing authorize slice with focused components/hooks/utils rather than introducing a separate subsystem or persistent cache layer. |
| IX | Artifact Integrity & Lifecycle Separation | PASS | Simulation reads the current deployed artifact identity and runtime package references but does not conflate simulation success with deployment or authorization readiness. |

**Initial Gate Result**: PASS

**Post-Design Re-check**: PASS. The final design keeps simulation non-mutating, reuses existing deployment and authorization boundaries, and introduces no constitution exceptions.

## 1.4. Project Structure

### 1.4.1. Documentation

```text
specs/018-simulate-turret-inputs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaces.md
└── tasks.md
```

### 1.4.2. Source Code

```text
src/
├── components/
│   ├── AuthorizeView.tsx                  # Modified: orchestrates selected turret simulation modal
│   ├── AuthorizeTurretList.tsx            # Modified: passes row-level simulate actions
│   ├── AuthorizeTurretItem.tsx            # Modified: adds simulate button and status affordances
│   └── TurretSimulationModal.tsx          # New: modal dialog for prefill, autocomplete, run, and results
├── hooks/
│   ├── useTurretList.ts                   # Possibly extended: exposes refresh/version data for stale checks
│   └── useTurretSimulation.ts             # New: modal orchestration, stale validation, run lifecycle
├── utils/
│   ├── authorizationTransaction.ts        # Reused: owner-character and owner-cap resolution helpers
│   ├── turretQueries.ts                   # Reused/possibly extended: turret object refresh helpers
│   ├── turretSimulationCodec.ts           # New: BCS encode/decode for candidate and result payloads
│   ├── turretSimulationExecution.ts       # New: dev-inspect transaction construction and result parsing
│   └── turretSimulationQueries.ts         # New: remote suggestion lookups and tolerant GraphQL parsing
├── types/
│   ├── authorization.ts                   # Reused: deployment and turret roster types
│   └── turretSimulation.ts                # New: simulation session, input draft, source map, and result types
├── __tests__/
│   ├── AuthorizeView.test.tsx             # Modified
│   ├── AuthorizeTurretItem.test.tsx       # Modified
│   ├── turretSimulationCodec.test.ts      # New
│   ├── turretSimulationExecution.test.ts  # New
│   ├── turretSimulationQueries.test.ts    # New
│   └── TurretSimulationModal.test.tsx     # New
└── App.tsx                                # Unchanged for primary routing; feature stays inside Authorize view

tests/
└── e2e/
    └── authorize.spec.ts                  # Modified or expanded with simulation scenarios
```

**Structure Decision**: Extend the existing authorize feature slice instead of creating a separate simulation route. The row action belongs in the existing turret item component, modal orchestration belongs in the Authorize view, and low-level BCS, GraphQL, and dev-inspect behavior belongs in narrowly scoped utilities under `src/utils/`.

## 1.5. Complexity Tracking

No constitution violations or exceptional complexity justifications are required.
