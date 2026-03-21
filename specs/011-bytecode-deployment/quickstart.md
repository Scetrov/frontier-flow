# Quickstart: Bytecode Deployment Targets

## Goal

Validate the deployment-target workflow from compiled artifact through progress modal and status-popup result handling.

## Prerequisites

- Bun dependencies installed
- A Sui-compatible wallet available for browser testing
- Existing compile/build workflow functional in the local app
- Maintained Stillness/Utopia package reference data present in the app source

## Run the app

```bash
bun dev
```

## Useful validation flags

Append these query parameters to the local app URL when you want deterministic deployment-state coverage during manual review:

- `ff_mock_wallet=connected` forces published-target wallet readiness.
- `ff_mock_wallet=disconnected` simulates an installed but disconnected wallet.
- `ff_mock_wallet=none` simulates no compatible wallet being available.
- `ff_mock_invalid_package_refs=1` blocks Stillness and Utopia because the maintained package references fail validation.
- `ff_local_deploy_ready=0` blocks the `local` target before submission.
- `ff_mock_deploy_reject=1` forces wallet approval rejection on published targets.
- `ff_mock_deploy_stage_delay_ms=<number>` slows or accelerates staged progress for modal review.

Example URLs:

```text
http://localhost:5173/?ff_mock_wallet=connected
http://localhost:5173/?ff_mock_wallet=disconnected&ff_mock_invalid_package_refs=1
http://localhost:5173/?ff_mock_wallet=connected&ff_mock_deploy_reject=1&ff_mock_deploy_stage_delay_ms=600
```

## Happy-path validation

1. Open Frontier Flow and confirm the existing Build control is present.
2. Build a valid graph until compilation reaches a successful state.
3. Open the deployment control next to Build and verify the available targets are `local`, `testnet:stillness`, and `testnet:utopia`.
4. Select a target and start deployment.
5. Confirm that a deployment modal opens immediately and shows staged progress.
6. Complete wallet approval when required.
7. Verify the footer/status popup shows the target-specific success summary and resulting package identifier.
8. Switch to the Move view and confirm the same deployment target, headline, and package ID are visible there.

## Blocker validation

1. Attempt deployment without a fresh compiled artifact and confirm the launch is blocked with a user-actionable status-popup message.
2. Open `/?ff_mock_wallet=disconnected`, target Stillness or Utopia, and confirm the workflow identifies the missing wallet prerequisite.
3. Open `/?ff_mock_invalid_package_refs=1&ff_mock_wallet=connected`, target Stillness or Utopia, and confirm deployment is blocked before submission.
4. Open `/?ff_local_deploy_ready=0`, target `local`, and confirm deployment is blocked before the progress flow advances.
5. Open `/?ff_mock_wallet=connected&ff_mock_deploy_reject=1`, target Stillness or Utopia, and confirm the workflow ends as cancelled, not successful.
6. Open `/?ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=600`, start deployment, dismiss the modal mid-flight, and confirm the footer/status popup and Move panel still reflect the final result.

## Session-history validation

1. Cause a blocked or cancelled deployment attempt.
2. Retry the same artifact with valid prerequisites until deployment succeeds.
3. Open the footer deployment popup and confirm the latest attempt is shown first.
4. Confirm earlier attempts remain visible as session history entries rather than being discarded.
5. Open the Move view and verify the same current summary plus earlier-session entries are mirrored there.

## Suggested test commands

```bash
bun run test:run
bun run lint
bun run typecheck
bun run test:e2e
```