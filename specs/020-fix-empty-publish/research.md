# 1. Research: Prevent Empty Publish Deployment

**Feature**: 020-fix-empty-publish  
**Date**: 2026-04-02

## 1.1. R1. Final Validation Boundary for Sui Move Publish Payloads

**Decision**: Perform the primary empty-publish validation in `src/deployment/executor.ts` after the final module source has been resolved and before either publisher is invoked.

**Rationale**: The regression only becomes observable once the real publish payload exists. Earlier validation only knows that some bytecode artifact was present, not whether the final materialized `modules` list is still non-empty after deploy-grade compilation or local rebuild logic. The executor is also the last shared point before wallet approval or transaction submission, which satisfies the spec requirement to block invalid attempts before either occurs.

**Alternatives considered**:

- Validate only in `src/utils/deploymentValidation.ts` during early readiness checks. Rejected because that stage does not see the final module set passed to Sui publish transactions.
- Validate only in the UI hook. Rejected because it would duplicate deployment-pipeline knowledge in a UI layer and weaken maintainability.

## 1.2. R2. Publisher Safety Net Before `Transaction.publish()`

**Decision**: Keep a second empty-payload guard inside both `src/deployment/publishRemote.ts` and `src/deployment/publishLocal.ts` immediately before constructing the Sui publish transaction.

**Rationale**: `@mysten/sui` transaction construction does not prevent `modules: []` from being passed through; the chain rejects the payload later with the confusing parser error seen in the bug report. Publisher-level validation is the last line of defense and protects future direct callers, focused unit tests, or code drift that bypasses the executor path.

**Alternatives considered**:

- Rely on the executor only. Rejected because it leaves transaction-construction helpers unsafe in isolation.
- Rely on chain-side validation. Rejected because it still prompts users to sign or wait on a doomed submission and surfaces the wrong error vocabulary.

## 1.3. R3. Outcome Classification and User Messaging

**Decision**: Surface empty publish payloads as a local `blocked` deployment outcome with an actionable remediation message rather than classifying them as a remote publish failure.

**Rationale**: The bug is a local readiness/integrity failure, not a network or chain failure. The existing `DeploymentAttempt`, `DeploymentStatus`, and `DeploymentReviewEntry` models already support blocked attempts, visible review history, and actionable next steps. Reusing those surfaces preserves recovery flows and avoids inventing a new lifecycle state.

**Alternatives considered**:

- Throw a generic exception and let the executor classify it as `failed`. Rejected because that would blur local validation failures with genuine submission failures.
- Surface the raw chain error to the user. Rejected because it is implementation noise and does not explain how to recover.

## 1.4. R4. Sui Move Publish Constraint to Encode in the Fix

**Decision**: Treat a publish payload as invalid when its final `modules` collection is empty, even if dependencies are present and even if earlier compilation/readiness steps reported success.

**Rationale**: A Sui Move publish transaction is only meaningful when it carries compiled package bytecode. The bug report’s transaction shows a non-empty dependency list with `modules: []`, which the chain rejects. Dependencies cannot compensate for a missing package body, so the guard should focus on the final module list itself.

**Alternatives considered**:

- Require both non-empty dependencies and non-empty modules. Rejected because dependencies may legitimately vary by target, but modules are always required for publish.
- Treat empty modules as acceptable for local-only flows. Rejected because both local and remote publishers use `Transaction.publish()` and share the same Sui contract.

## 1.5. R5. Regression Coverage Strategy

**Decision**: Extend existing unit and integration tests around the executor, publishers, hook state, and deployment review popup rather than depending on a new browser-only regression.

**Rationale**: The repository already has strong deployment test coverage, factory helpers, and URL-driven mock flags for wallet and environment state. The regression is deterministic and easiest to verify close to the executor and publisher boundaries where the invalid payload is assembled. UI-level tests should only assert the user-visible blocked outcome and history retention, not re-prove low-level transaction semantics repeatedly.

**Alternatives considered**:

- Add only a Playwright regression. Rejected because it would be slower, less isolated, and harder to diagnose when the payload contract regresses again.
- Add only publisher tests. Rejected because the spec also requires pre-wallet blocking and visible blocked-attempt history, which live above the publisher layer.
