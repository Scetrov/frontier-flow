# Research: Verified Contract Deployment

## Decision 1: Keep the existing deployment state machine, but replace the simulated scheduler with an injected Sui deployment executor

**Decision**: Preserve the typed deployment orchestration in `useDeployment`, but move real publish, confirmation polling, and evidence extraction into a dedicated execution layer that can be mocked in tests and backed by Sui SDK calls in real deployments.

**Rationale**: The repository already models blockers, stages, review history, and UI surfaces cleanly. The missing capability is not state modeling; it is real execution. Isolating execution prevents UI components and timers from owning JSON-RPC, wallet, or transaction-confirmation behavior.

**Alternatives considered**:

- Put Sui submission logic directly inside `useDeployment`. Rejected because it would entangle UI state transitions with wallet/RPC details and make deterministic testing harder.
- Keep the current timer-based success path and only swap in real package IDs later. Rejected because the spec explicitly forbids fabricated success semantics in normal user flows.

## Decision 2: Treat Sui transaction digest as the confirmation reference for successful deployments

**Decision**: Use the Sui transaction digest returned by the confirmed publish transaction as the `confirmationReference` shown in deployment evidence and user-facing success surfaces.

**Rationale**: The spec requires a confirmation reference for every successful deployment. In Sui, the transaction digest is the stable, user-verifiable identifier for the publish operation and is the natural audit handle for follow-up validation.

**Alternatives considered**:

- Reuse only the package ID as both result and confirmation evidence. Rejected because it does not distinguish published artifact identity from the confirming transaction.
- Invent a session-local confirmation token. Rejected because it would add non-chain evidence that users cannot independently verify.

## Decision 3: Resolve world-package dependencies by target, with local validator publish using local dependency wiring and published targets using maintained reference bundles

**Decision**: Continue to maintain Stillness and Utopia package-reference bundles in source, and treat local deployment as a separate path that resolves `world` through local dependency wiring rather than published addresses.

**Rationale**: Repo documentation already establishes source-controlled package references for published targets and explicitly distinguishes local-path dependencies from on-chain package addresses. This preserves deterministic behavior and avoids runtime fetching.

**Alternatives considered**:

- Fetch target reference data at runtime from external documentation. Rejected because it creates runtime fragility and breaks deterministic tests.
- Use published package addresses for every target, including local. Rejected because local validator workflows do not share the same package identity assumptions as Stillness and Utopia.

## Decision 4: Introduce an explicit unresolved-confirmation outcome with bounded verification retries

**Decision**: Add a first-class `unresolved` outcome for attempts where submission occurs but the application cannot obtain confirmation within the allowed verification window, while keeping `failed` for known negative terminal outcomes.

**Rationale**: The spec requires that lack of confirmation must not be misclassified as success. A separate unresolved state gives users accurate guidance when the system cannot prove the final result even though submission may have happened.

**Alternatives considered**:

- Collapse missing confirmation into `failed`. Rejected because it hides the distinction between a confirmed negative result and a verification gap.
- Keep polling indefinitely. Rejected because it creates poor UX, complicates modal dismissal semantics, and weakens repeatable testing.

## Decision 5: Keep simulated deployment behavior only in isolated test harnesses and deterministic verification fixtures

**Decision**: Preserve the existing `ff_mock_*` flags only for unit, component, and E2E harnesses, but make the normal user-facing deployment path depend on real executor results.

**Rationale**: The current repo already has strong deterministic test patterns based on fake timers and URL flags. Those are valuable for coverage, but they must remain clearly isolated from normal product behavior to satisfy the spec’s correctness requirements.

**Alternatives considered**:

- Remove all simulated deployment behavior immediately. Rejected because the test suite still needs deterministic hooks for blocker matrices and UI-state verification.
- Continue allowing simulated submission in development mode. Rejected because it would blur the boundary between test harnesses and user-visible correctness.

## Decision 6: Validate deployment through two Sui-specific verification tracks: local validator repeatability and supported remote-target confirmation

**Decision**: Define one repeatable verification track against a project-controlled local validator and one supported remote-target confirmation track using the same user-facing deployment workflow.

**Rationale**: The feature spec requires both correctness and testability. Local validator publish gives deterministic coverage under project control, while a remote publish path proves the workflow against actual wallet-backed confirmation semantics.

**Alternatives considered**:

- Local-only verification. Rejected because it would not prove the remote wallet and confirmation path.
- Remote-only verification. Rejected because it would be more fragile, slower, and less suitable for repeated deterministic validation.
