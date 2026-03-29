# 1. Research: Turret Input Simulation

**Feature**: `018-simulate-turret-inputs`
**Date**: 2026-03-29

## 1.1. Runtime Execution Path

**Decision**: Execute simulations through `SuiJsonRpcClient.devInspectTransactionBlock` using the same two-step runtime path already proven in `scripts/debug-turret-priority-mcve.ts`: call `world::turret::verify_online(&Turret)` to obtain an `OnlineReceipt`, then call `<deploymentPackageId>::<moduleName>::get_target_priority_list(&Turret, &Character, vector<u8>, OnlineReceipt)`.

**Rationale**: This matches the deployed extension's real Move entry point, remains non-mutating, avoids wallet signing, and already has a working reference implementation in the repository. It also validates the selected turret against the world contract's online checks instead of approximating execution in JavaScript.

**Alternatives considered**:

- Local JavaScript evaluator: Rejected because it would diverge from deployed Move semantics and would not validate `OnlineReceipt` handling.
- Signed on-chain transaction: Rejected because the feature explicitly must not mutate state and should not require wallet approval for every test run.
- Dedicated backend simulation service: Rejected because the app is a browser SPA today and the repository already contains a viable client-side dev-inspect path.

## 1.2. BCS Serialization Contract

**Decision**: Add a dedicated TypeScript codec utility built on `@mysten/sui/bcs` that mirrors the stable field ordering already documented for `TargetCandidateArg` and `ReturnTargetPriorityList`.

**Rationale**: The repository already uses these exact shapes in `scripts/debug-turret-priority-mcve.ts`, `docs/OUTSTANDING-QUESTIONS.md`, and generated Move fixtures. A dedicated codec utility keeps serialization deterministic, unit-testable, and reusable from both the modal flow and tests.

**Alternatives considered**:

- Hand-rolled `Uint8Array` encoding: Rejected because it is error-prone and obscures the schema.
- Parsing generated Move source at runtime: Rejected because the schema is already stable and does not need dynamic extraction.

## 1.3. Candidate Input Scope

**Decision**: Model the first release as a single editable candidate draft per simulation run, with repeated reruns used to compare scenarios for the same turret.

**Rationale**: The feature spec describes a row-scoped modal and a nearly complete candidate-input form, not a scenario matrix editor. A single candidate keeps the UI focused, still exercises the deployed extension path, and supports the required compare-and-rerun workflow without adding list-building complexity.

**Alternatives considered**:

- Multi-candidate batch editor inside one modal: Rejected for the first release because it expands the data model and result rendering surface significantly beyond the spec's core usability goal.
- Preset-only scenarios with no editable fields: Rejected because the spec requires operators to override suggested values and test custom cases.

## 1.4. Prefill And Autocomplete Strategy

**Decision**: Split field resolution into three tiers.

1. Local prefill for deployment and turret-bound values already available in the Authorize flow.
2. Remote GraphQL suggestions for identity fields that can be inferred from published world data.
3. Deterministic defaults plus manual editing for combat-state scalars that are not reliably queryable.

**Rationale**: The existing Authorize flow already provides `StoredDeploymentState`, selected turret identity, wallet address, turret extension metadata, and character/owner-cap lookup helpers. Remote GraphQL data is useful for fields like owner character identity, tribe, turret object identity, and object-derived target metadata, but fields such as `hp_ratio`, `shield_ratio`, `armor_ratio`, `is_aggressor`, and `behaviour_change` are scenario inputs rather than authoritative remote state. Treating those as editable defaults satisfies the spec without inventing unreliable lookups.

**Alternatives considered**:

- Require manual entry for all unresolved fields: Rejected because it would fail the feature's main usability objective.
- Force every field to come from GraphQL suggestions: Rejected because combat-state and behavior fields are scenario-specific, not durable remote facts.

## 1.5. Remote Suggestion Sources

**Decision**: Build suggestion helpers around the same published world data sources already trusted by authorization utilities, using tolerant field extraction rather than rigid JSON shapes.

**Rationale**: `src/utils/turretQueries.ts` and `src/utils/authorizationTransaction.ts` already prove that the published GraphQL payloads vary across targets and wrappers. The simulation feature should reuse the same parsing posture for:

- owner-character suggestions from wallet-owned `PlayerProfile` objects
- selected turret refresh and extension identity validation from the turret object lookup
- candidate object lookups that can derive or confirm `item_id`, `type_id`, `group_id`, `character_id`, and `character_tribe` when an operator selects or types an object identifier

**Alternatives considered**:

- Strict schema decoding for one target only: Rejected because the current authorization stack already needs tolerant parsing across Stillness and Utopia.
- Background indexing cache: Rejected because the suggestion surface is small and on-demand queries are sufficient.

## 1.6. Stale Context Detection

**Decision**: Snapshot the modal's opening context as a composite key of deployment identity and selected turret identity, then revalidate that snapshot against the live `deploymentState` and the latest turret list before every simulation run.

**Rationale**: The current Authorize view already computes a deployment key and can refresh the turret list. Reusing those signals is simpler and safer than polling on a timer. If the deployment package/module changes, the turret disappears, or the turret's current extension identity no longer matches the modal snapshot, the run action should disable and the modal should show a refresh/reopen message.

**Alternatives considered**:

- Allow runs to proceed with the opening snapshot even when the page state changes: Rejected because the spec explicitly forbids stale simulations.
- Poll the server continuously while the modal is open: Rejected because it adds network churn without improving correctness over run-time validation and manual refresh.

## 1.7. Result Rendering

**Decision**: Decode the returned `vector<u8>` into `ReturnTargetPriorityList[]` and render it as a ranked result table, with a separate empty-state presentation for a valid empty list and a separate error panel for failed runs.

**Rationale**: The spec requires operators to distinguish successful empty-result simulations from failures. A ranked table for successful results and an explicit empty-state card for `[]` keeps that distinction clear while staying consistent with the repository's existing modal feedback patterns.

**Alternatives considered**:

- Show raw BCS bytes or raw dev-inspect payloads: Rejected because the result would not be operator-friendly.
- Collapse empty results into a generic warning banner: Rejected because it violates the acceptance criteria.

## 1.8. Testing Strategy

**Decision**: Cover the feature with five layers of tests: codec unit tests, execution unit tests with mocked dev-inspect responses, query parsing tests, modal component tests, and an authorize-tab E2E flow.

**Rationale**: The logic splits cleanly across serialization, remote parsing, UI orchestration, and integration with the existing Authorize workflow. The repository already uses Vitest, Testing Library, Playwright, and MSW, so the feature can extend proven patterns rather than inventing new test harnesses.

**Alternatives considered**:

- E2E-only coverage: Rejected because BCS and query parsing failures would be harder to diagnose.
- Unit-only coverage: Rejected because the row action and modal flow must be proven in the existing Authorize screen.
