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

Optional workspace verification before manual deployment checks:

```bash
bun run typecheck
bun run lint
bun run test:run
```

## Local validator verification

1. Start the local Sui validator using your standard local Sui workflow and confirm the JSON-RPC endpoint is reachable at `http://127.0.0.1:9000`.
2. Open Frontier Flow and build a valid graph until compilation succeeds and the footer shows `Compiled`.
3. Select `local` in the deployment control.
4. Start deployment and confirm the progress surface enters `validating`, `preparing`, `submitting`, and `confirming` in order. The local path does not include `signing`.
5. Wait for the deployment to finish and verify the final success state includes:
   - the selected target `local`
   - a real package identifier
   - a real confirmation reference
6. Open the persistent review surfaces and confirm they show the same target, artifact identity, package identifier, and transaction digest.
7. Repeat the same verification scenario five times and confirm the final outcome classification remains `succeeded` on all five runs.

## Remote target verification

1. Ensure a supported remote target is selected, either `testnet:stillness` or `testnet:utopia`.
2. Confirm a Sui-compatible wallet is connected before launch.
3. Confirm the selected target is not blocked by package-reference validation.
4. Start deployment and complete the signing flow in the wallet.
5. Verify the progress surface includes `validating`, `preparing`, `signing`, `submitting`, and `confirming` in order.
6. Confirm the terminal success state includes:
   - the selected target
   - the published package identifier
   - the Sui transaction digest used as confirmation reference
7. Open the persistent review surfaces and verify the same evidence appears there.
8. Repeat the same scenario for the second supported remote target when available so both maintained reference bundles are covered.

## Non-success outcome verification

Validate each outcome class at least once:

1. `blocked`: attempt deployment with a stale or missing compiled artifact and confirm submission never starts.
2. `cancelled`: reject wallet approval and confirm the attempt ends as `cancelled`.
3. `failed`: trigger a known target-side or execution failure and confirm the failure stage and remediation are shown.
4. `unresolved`: simulate or induce a case where submission occurs but confirmation cannot be proven within the verification window, and confirm the attempt is not shown as successful.

Expected blocker guidance after implementation:

- `local`: local readiness failures should mention the unavailable local validator explicitly.
- `testnet:stillness` or `testnet:utopia`: wallet blockers should mention the selected remote target explicitly.
- Published-target reference failures should mention the selected remote target explicitly and instruct the user to refresh maintained package-reference data for that target.

## Isolated deterministic test harness checks

The existing `ff_mock_*` flags remain valid only for deterministic test harnesses and manual UI review of non-production behavior.

Useful examples:

```text
http://localhost:5173/?ff_mock_wallet=connected
http://localhost:5173/?ff_mock_wallet=connected&ff_mock_deploy_reject=1
http://localhost:5173/?ff_local_deploy_ready=0
http://localhost:5173/?ff_mock_invalid_package_refs=1&ff_mock_wallet=connected
http://localhost:5173/?ff_mock_wallet=connected&ff_mock_deploy_fail=1
http://localhost:5173/?ff_mock_wallet=connected&ff_mock_deploy_unresolved=1
```

Use these flags to validate blocker, cancellation, and progress-surface behavior without treating the results as real deployments.

Harness notes:

- `ff_local_deploy_ready=0` forces the local-validator blocker path.
- `ff_mock_invalid_package_refs=1` forces the remote reference-data blocker path.
- `ff_mock_deploy_reject=1` forces the wallet-cancelled path.
- `ff_mock_deploy_fail=1` forces a failed submission path.
- `ff_mock_deploy_unresolved=1` forces an unresolved confirmation path.

## Suggested verification commands

```bash
bun run test:run
bun run lint
bun run typecheck
bun run test:e2e
```

Targeted deployment-path commands:

```bash
bun run test:run src/__tests__/useDeployment.success.test.ts src/__tests__/useDeployment.blockers.test.ts src/__tests__/useDeployment.progress.test.ts
bun run playwright test tests/e2e/deployment-progress.spec.ts tests/e2e/deployment-blockers.spec.ts tests/e2e/deployment-status-popup.spec.ts
```

## Coverage verification

Deployment-path coverage was verified with the following targeted command:

```bash
bunx vitest run \
   src/__tests__/useDeployment.success.test.ts \
   src/__tests__/useDeployment.blockers.test.ts \
   src/__tests__/useDeployment.progress.test.ts \
   src/__tests__/DeploymentTargetControl.test.tsx \
   src/__tests__/DeploymentProgressModal.test.tsx \
   src/__tests__/CompilationStatus.deployment-popup.test.tsx \
   src/__tests__/CompilationStatus.deployment-blockers.test.tsx \
   src/__tests__/MoveSourcePanel.deployment.test.tsx \
   src/__tests__/deploymentValidation.test.ts \
   src/__tests__/deploymentExecutor.test.ts \
   src/__tests__/deployment/testFactories.test.ts \
   --coverage \
   --coverage.reporter=text-summary \
   --coverage.reporter=json-summary \
   --coverage.include='src/deployment/**' \
   --coverage.include='src/hooks/useDeployment.ts' \
   --coverage.include='src/utils/deploymentValidation.ts' \
   --coverage.include='src/components/DeploymentProgressModal.tsx' \
   --coverage.include='src/components/DeploymentTargetControl.tsx' \
   --coverage.include='src/components/CompilationStatus.tsx' \
   --coverage.include='src/components/MoveSourcePanel.tsx'
```

Recorded deployment-path totals from `coverage/coverage-summary.json`:

- Statements: `77.39 %`
- Branches: `67.68 %`
- Functions: `83.13 %`
- Lines: `77.40 %`

Threshold comparison:

- Constitution minimum statements threshold `70 %`: pass
- Constitution minimum branches threshold `65 %`: pass
- Constitution minimum functions threshold `75 %`: pass
- Constitution minimum lines threshold `70 %`: pass

Notes:

- This targeted deployment-path run satisfies the constitution minimums.
- It does not meet the `>= 90 %` critical-path target described in the testing strategy for every included deployment file.
- A full-repository coverage run is currently blocked by unrelated failures in `src/__tests__/MoveSourcePanel.test.tsx`; use the targeted command above for deployment-path verification until that regression is resolved.

## Recorded local verification results

Real local-validator verification was executed against the running dev server at `http://127.0.0.1:5173/` with the seeded `Example · Turret Aggressor First` contract after fixing the publish transaction to transfer the returned upgrade capability.

Observed result:

- Selected target: `local`
- Final outcome: `succeeded`
- Example confirmed package ID: `0x623d05b685fbc0596a7e90649ecefb0c23f02c793f8525f08c6b96d8d74f8066`
- Example confirmation reference: `BBAjRJndGbBUmHHSMB2HE24LzDtfujLRhnTb3Kk1w4N`

Five-run repeatability check for the same local scenario:

1. Attempt 1: `succeeded` in `2894 ms` with package `0xe2829a3c228972dfbf08f9335b9c4f69d4d1849badc01fc47f5969afa266e3c7`
2. Attempt 2: `succeeded` in `2897 ms` with package `0xc89264902be4c53ff2583523fd84fe38245b104c3346ae452553f37dd6e3cabd`
3. Attempt 3: `succeeded` in `2879 ms` with package `0x0c7b9da8d75cd1e60ee98d919471109b24e2648514d9192f8faded795229debb`
4. Attempt 4: `succeeded` in `2906 ms` with package `0x9f2d7b57cfe2674e3719fbbabac0b14c39be46dbf1d854bbcb5adc71c0fac899`
5. Attempt 5: `succeeded` in `2893 ms` with package `0x8bd2ef10edc303573903402a7482233586bde7fadaf28f48ff6b9346cc8c5003`

Summary against success criteria:

- SC-003 local completion time target `<= 3 minutes`: pass
- Measured average local completion time: `2894 ms`
- SC-007 repeatability requirement for the recorded local scenario: pass (`5/5` succeeded)

## Recorded remote verification results

Real remote deployment verification was completed against `testnet:stillness` in the MCP-controlled Chromium session after enabling the EVE Vault extension in [/.vscode/mcp.json](/home/scetrov/source/frontier-flow/.vscode/mcp.json) and connecting the wallet through the live app.

Observed success result:

- Selected target: `testnet:stillness`
- Final outcome: `succeeded`
- Confirmed package ID: `0xff072624e0438aa750f352e4d13ca0fc253cb06ab45fcf05a5648220ca289a8e`
- Confirmation reference: `Ahgx5Ry1oGykCkb6rn3ZvH2bfEZK8GkoJf88me4RXqNL`
- Review surfaces reflected the same target, package ID, and transaction digest after completion.

Current limitation for timing capture:

- One subsequent retry in the same MCP-driven wallet session failed with `Transaction signing timed out`; that failure path was traced to premature `submitting` stage advancement in the app and to executor-backed attempts stamping `startedAt` only at completion.
- After fixing the remote stage transition boundary and preserving executor-backed attempt start times, a clean timed retry succeeded with the following evidence:
   - Timed target: `testnet:stillness`
   - Timed package ID: `0xa0cb6ee594b1c72d869fe8b09a192c3c432db9d8ce2338a3b3affb91a53008ba`
   - Timed confirmation reference: `A3JYukkpMne7PwxzfSAyHfn4yEL4gvYi8hFY5NSNZ6L`
   - `latestAttempt.startedAt`: `1774198329204`
   - `latestAttempt.endedAt`: `1774198333572`
   - Confirmed transaction timestamp from `sui_getTransactionBlock`: `1774198330850`

Summary against success criteria:

- SC-004 remote completion time target `<= 5 minutes`: pass
- Measured remote completion time from deployment launch to surfaced evidence: `4368 ms`
- SC-005 confirmation-to-evidence latency target `<= 10 seconds`: pass
- Measured confirmation-to-evidence latency from target confirmation timestamp to surfaced evidence: `2722 ms`
