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

## Post-Implementation Findings

### Finding 1: Local deployment now uses an ephemeral keypair plus localnet faucet funding before publish

**Finding**: The implemented local path creates an ephemeral Ed25519 keypair, funds it from the localnet faucet, then publishes directly through the local validator RPC endpoint.

**Evidence**:

- `src/deployment/publishLocal.ts` constructs a `SuiJsonRpcClient` against `http://127.0.0.1:9000`.
- The same module requests localnet faucet funds before calling `signAndExecuteTransaction`.

**Implication**: Local verification remains project-controlled and avoids dependence on a browser wallet, but it also assumes the local faucet and local validator are both available when the test run begins.

### Finding 2: Remote publish evidence is digest-first and package ID is finalized during confirmation

**Finding**: The remote publish path returns the submitted transaction digest immediately, while the final package identifier is resolved during confirmation rather than at submit time.

**Evidence**:

- `src/deployment/publishRemote.ts` returns only the wallet-submitted transaction digest.
- `src/deployment/confirmation.ts` resolves the published package ID from transaction object changes once the transaction settles.

**Implication**: Success evidence remains target-confirmed and audit-friendly, but any UI or verification step that expects a package ID before confirmation is complete is incorrect.

### Finding 3: Both supported remote targets currently share the Sui testnet execution path and differ by maintained reference data

**Finding**: `testnet:stillness` and `testnet:utopia` both execute through the same Sui testnet wallet and RPC path, but they remain distinct deployment targets because they bind to different maintained package-reference bundles and user-facing labels.

**Evidence**:

- `src/data/deploymentTargets.ts` maps both supported remote targets to the Sui testnet network family.
- `src/data/packageReferences.ts` maintains distinct reference bundles for Stillness and Utopia.

**Implication**: Verification guidance must keep target-specific wording even though the wallet chain and base RPC path are shared.

### Finding 4: Real confirmation uses transaction-settlement waiting, while unresolved outcomes remain bounded and explicit

**Finding**: The real deployment path confirms transactions by waiting for transaction settlement on the selected RPC client, and unresolved confirmation remains a first-class terminal outcome when confirmation cannot be proven.

**Evidence**:

- `src/deployment/confirmation.ts` uses `waitForTransaction` with effects and object-change options enabled.
- `src/deployment/executor.ts` maps missing confirmation to `unresolved` and preserves the transaction digest as the confirmation reference candidate.

**Implication**: The implementation satisfies the spec requirement not to surface unconfirmed deployments as success, while keeping enough evidence for manual verification or retry.
