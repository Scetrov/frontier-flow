# Quickstart: Verified Contract Deployment

## Goal

Validate that Frontier Flow can publish a compiled Sui package to a local validator and to a supported remote target, classify outcomes correctly, and preserve auditable deployment evidence.

## Prerequisites

- Bun dependencies installed
- A working Frontier Flow compile/build flow
- Sui toolchain available for local-validator work
- A running local Sui validator for local deployment verification
- A Sui-compatible wallet available for remote deployment verification
- Maintained Stillness/Utopia reference data present in source

## Run the app

```bash
bun dev
```

## Local validator verification

1. Start the local Sui validator using your standard local Sui workflow.
2. Open Frontier Flow and build a valid graph until compilation succeeds.
3. Select `local` in the deployment control.
4. Start deployment and confirm the progress surface enters `validating`, `preparing`, `submitting`, and `confirming` in order.
5. Verify the final success state includes:
   - the selected target `local`
   - a real package identifier
   - a real confirmation reference
6. Repeat the same verification scenario five times and confirm the final outcome classification remains `succeeded` on all five runs.

## Remote target verification

1. Ensure a supported remote target is selected, either `testnet:stillness` or `testnet:utopia`.
2. Confirm wallet connectivity and target readiness before launch.
3. Start deployment and complete the signing flow in the wallet.
4. Verify the progress surface includes `signing`, `submitting`, and `confirming`.
5. Confirm the terminal success state includes:
   - the selected target
   - the published package identifier
   - the Sui transaction digest used as confirmation reference
6. Open the persistent review surfaces and verify the same evidence appears there.

## Non-success outcome verification

Validate each outcome class at least once:

1. `blocked`: attempt deployment with a stale or missing compiled artifact and confirm submission never starts.
2. `cancelled`: reject wallet approval and confirm the attempt ends as `cancelled`.
3. `failed`: trigger a known target-side or execution failure and confirm the failure stage and remediation are shown.
4. `unresolved`: simulate or induce a case where submission occurs but confirmation cannot be proven within the verification window, and confirm the attempt is not shown as successful.

## Isolated deterministic test harness checks

The existing `ff_mock_*` flags remain valid only for deterministic test harnesses and manual UI review of non-production behavior.

Useful examples:

```text
http://localhost:5173/?ff_mock_wallet=connected
http://localhost:5173/?ff_mock_wallet=connected&ff_mock_deploy_reject=1
http://localhost:5173/?ff_local_deploy_ready=0
http://localhost:5173/?ff_mock_invalid_package_refs=1&ff_mock_wallet=connected
```

Use these flags to validate blocker, cancellation, and progress-surface behavior without treating the results as real deployments.

## Suggested verification commands

```bash
bun run test:run
bun run lint
bun run typecheck
bun run test:e2e
``
