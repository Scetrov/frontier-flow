# Contract: Sui Deployment Execution Boundary

## Purpose

Define the boundary between Frontier Flow deployment orchestration and the real Sui publish executor used for local-validator and remote-target deployment.

## Execution Input Contract

Each deployment execution request must provide:

- `attemptId`: unique deployment attempt identifier
- `artifactId`: selected compiled artifact identifier
- `graphRevision`: artifact graph revision captured at launch
- `targetId`: one of `local`, `testnet:stillness`, `testnet:utopia`
- `bytecodeModules`: exact modules to publish for this attempt
- `targetReferences`: published target reference bundle when required by target
- `requiresWalletSigning`: boolean derived from the selected target

## Execution Guarantees

- The executor must publish only the artifact bound to the request.
- The executor must use the selected target and must not silently redirect to another environment.
- The executor must never fabricate a package identifier or success response.
- A success response is valid only after target confirmation has been obtained.

## Stage Contract

The execution boundary must report stage progression through the following ordered stages:

1. `validating`
2. `preparing`
3. `signing` when wallet approval is required
4. `submitting`
5. `confirming`

Rules:

- `local` may skip `signing` but must preserve the remaining stage order.
- Stage updates must be monotonic and must not move backwards.
- The orchestration layer may dismiss the visible progress surface without cancelling the underlying execution.

## Terminal Outcome Contract

The executor and orchestration layer together must classify each attempt as exactly one of:

- `blocked`: prerequisites failed before submission
- `cancelled`: user rejected approval or explicitly cancelled before submission completed
- `failed`: target or execution returned a known negative terminal result
- `unresolved`: submission occurred but confirmation could not be proven within the verification window
- `succeeded`: target confirmation was obtained

Rules:

- `succeeded` requires both `packageId` and `confirmationReference`.
- `unresolved` must include next-step guidance for manual verification or retry.
- `blocked`, `cancelled`, `failed`, and `unresolved` must never be surfaced as success.

## Success Evidence Contract

Every successful deployment must return:

- `packageId`: published Sui package identifier
- `confirmationReference`: Sui transaction digest for the confirming publish transaction
- `submittedAt`: accepted submission timestamp
- `confirmedAt`: confirmation timestamp
- `targetId`: selected target

## Failure and Verification Contract

- If the selected target rejects or fails the publish request, the outcome must be `failed`.
- If the selected target accepted submission but the application cannot confirm the final publish result within the bounded verification window, the outcome must be `unresolved`.
- If the artifact no longer matches the active graph before submission begins, the outcome must be `blocked`.
- If wallet approval is rejected, the outcome must be `cancelled`.
