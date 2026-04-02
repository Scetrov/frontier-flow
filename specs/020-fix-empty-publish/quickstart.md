# 1. Quickstart: Prevent Empty Publish Deployment

**Feature**: 020-fix-empty-publish

## 1.1. Overview

This feature hardens Frontier Flow's Sui Move deployment pipeline so the app never asks a user to sign or submit a publish transaction whose final package body is empty.

## 1.2. Architecture Summary

The fix adds one new shared integrity check and two safety nets:

1. **Executor gate**: inspect the final publish payload after compilation/module resolution and block the attempt locally if the module list is empty.
2. **Remote publisher safety net**: reject empty module sets immediately before `Transaction.publish()`.
3. **Local publisher safety net**: reject empty module sets after local rebuild resolution and before `Transaction.publish()`.

This preserves the existing Sui Move deployment model:

- authoring compile stays separate from deploy-grade compilation
- wallet approval remains reserved for valid publish attempts
- blocked attempts continue to appear in the deployment review surfaces

## 1.3. Implementation Sequence

### 1.3.1. Add final payload validation

- Materialize the final module list from `DeployGradeCompileResult.modules` or local publish resolution.
- Validate the package immediately before publisher invocation.
- Return a blocked executor result with actionable remediation when the payload is empty.

### 1.3.2. Add publisher guard rails

- Guard `src/deployment/publishRemote.ts` before constructing the remote Sui publish transaction.
- Guard `src/deployment/publishLocal.ts` before constructing the local Sui publish transaction.

### 1.3.3. Preserve user-facing blocked-state behavior

- Keep the outcome in existing `DeploymentStatus`, `DeploymentStatusMessage`, and `DeploymentReviewEntry` surfaces.
- Ensure the user can rebuild and retry in the same session without losing the earlier blocked attempt.

### 1.3.4. Extend regression coverage

- Add executor tests for pre-wallet blocking.
- Add remote and local publisher tests that verify `Transaction.publish()` is never reached with empty modules.
- Add hook/status tests for blocked messaging and review-history retention.

## 1.4. Verification Steps

### 1.4.1. Automated

Run the focused regression suite during implementation:

```bash
bun run test:run -- src/__tests__/deploymentExecutor.test.ts src/__tests__/publishRemote.test.ts src/__tests__/publishLocal.test.ts src/__tests__/useDeployment.blockers.test.ts
```

Then run the standard workspace checks:

```bash
bun run typecheck
bun run lint
bun run test:run
```

### 1.4.2. Manual

1. Build a contract that normally deploys successfully and confirm published-target deployment still proceeds to wallet approval and submission.
2. Force or mock a deployment path whose final publish payload resolves to no modules and confirm the attempt is blocked before wallet approval.
3. Confirm the footer and deployment review surfaces show the blocked attempt with actionable remediation instead of the raw chain error.
4. Rebuild the package, retry deployment in the same session, and confirm the new attempt can succeed while the earlier blocked attempt remains in history.

## 1.5. Expected User Outcome

- Users no longer see the Sui parser error for empty publish payloads as the primary failure mode.
- Invalid Sui Move publish attempts are stopped before signing.
- Recovery is a straightforward rebuild-and-retry flow inside the existing deployment UI.
