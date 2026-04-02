# 1. Implementation Plan: Prevent Empty Publish Deployment

**Branch**: `020-fix-empty-publish` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-fix-empty-publish/spec.md`

## 1.1. Summary

Prevent Frontier Flow from constructing or submitting Sui Move publish transactions with an empty `modules` list by adding a final publish-payload readiness check before wallet approval and transaction submission, classifying the outcome as a local blocked deployment, and preserving existing deployment review surfaces for same-session recovery.

## 1.2. Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES Modules) with Sui Move package publishing via `@mysten/sui`  
**Primary Dependencies**: React 19, `@mysten/sui`, `@mysten/dapp-kit`, `@zktx.io/sui-move-builder` 0.2.8, Vitest, Testing Library  
**Storage**: localStorage for deployment state and review continuity; in-memory deployment execution state  
**Testing**: Vitest + @testing-library/react for unit/integration, existing deployment mocks via URL flags, Playwright only if current regression needs browser-level coverage  
**Target Platform**: Browser SPA that builds and publishes Sui Move packages to localnet and testnet targets  
**Project Type**: Web application with client-side Sui Move compile and deploy pipeline  
**Performance Goals**: Block invalid empty-payload publishes before wallet approval and surface the reason within 3 seconds; add no extra approval steps for valid publishes  
**Constraints**: No server-side deploy broker, preserve existing deployment stages and history model, maintain authoring/deploy-grade lifecycle separation, avoid exposing raw chain parser errors as the primary user message  
**Scale/Scope**: 3 deployment targets (`local`, `testnet:stillness`, `testnet:utopia`), single active deployment attempt per session, one targeted regression in the publish path

## 1.3. Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                     | Status | Notes                                                                                                                              |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| I. Type Safety Above All                      | PASS   | Changes stay in strict TypeScript deployment types and executor contracts; no new untyped paths required.                          |
| II. Visual Feedback is Paramount              | PASS   | The fix strengthens blocked-deployment messaging and preserves progress/review surfaces instead of surfacing a late chain failure. |
| III. Domain-Driven Design                     | PASS   | Scope stays within deployment concepts users already understand: build, deploy, blocked attempt, retry.                            |
| IV. Predictable Code Generation               | PASS   | Generated Move code is unchanged; the plan only validates final publish payload integrity before signing/submission.               |
| V. Security by Default                        | PASS   | Prevents malformed transaction approval, preserves error sanitization, and avoids relying on raw RPC failure text.                 |
| VI. Test-First Quality                        | PASS   | Plan adds regression coverage across executor, publishers, hook/state surfaces, and user-visible blocker behavior.                 |
| VII. Accessibility & Inclusion                | PASS   | Existing accessible deployment messaging surfaces remain the delivery path; no new inaccessible workflow is introduced.            |
| VIII. Durability & Maintainability            | PASS   | Reuses existing deployment status/review models rather than adding a parallel state machine.                                       |
| IX. Artifact Integrity & Lifecycle Separation | PASS   | The plan adds a final publish-payload integrity gate without collapsing compile readiness and deployment lifecycle state.          |

No violations. No complexity tracking entries required.

## 1.4. Project Structure

### 1.4.1. Documentation (this feature)

```text
specs/020-fix-empty-publish/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── interfaces.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### 1.4.2. Source Code (repository root)

```text
src/
├── compiler/
│   └── types.ts                     # VERIFY/possibly extend error and payload metadata contracts
├── deployment/
│   ├── executor.ts                  # MODIFY: final publish-payload readiness gate before publisher invocation
│   ├── publishRemote.ts             # MODIFY: reject empty publish payload before Transaction.publish()
│   └── publishLocal.ts              # MODIFY: reject empty publish payload before Transaction.publish()
├── hooks/
│   └── useDeployment.ts             # MODIFY: preserve blocked attempt messaging/history semantics for payload validation failures
└── utils/
    └── deploymentValidation.ts      # MODIFY or KEEP: align blocker/error messaging with the new payload-level guard

src/__tests__/
├── deploymentExecutor.test.ts       # MODIFY: blocked outcome before wallet approval/submission
├── publishRemote.test.ts            # MODIFY: publisher safety-net rejects empty modules
├── publishLocal.test.ts             # MODIFY: local publisher rejects empty modules
├── useDeployment.blockers.test.ts   # MODIFY: blocked state/message and retry semantics
└── CompilationStatus.deployment-popup.test.tsx  # MODIFY: blocked attempt remains visible in review history
```

**Structure Decision**: Keep all changes inside the existing browser deployment pipeline. The primary gate belongs in `src/deployment/executor.ts`, because that is the last shared point before wallet-backed or local publishing diverges. Publisher-level guards in `src/deployment/publishRemote.ts` and `src/deployment/publishLocal.ts` remain as safety nets. User-visible blocked-state behavior continues through `src/hooks/useDeployment.ts` and existing deployment review surfaces instead of introducing a new subsystem.

## 1.5. Research Summary

Full findings in [research.md](research.md). Key decisions:

| Topic                     | Decision                                                                                                               | Reference |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| Final validation boundary | Validate the final publish payload in the executor after compilation/module resolution but before publisher invocation | R1        |
| Publisher safety net      | Duplicate the empty-payload guard inside local and remote publishers before `Transaction.publish()`                    | R2        |
| User-facing outcome       | Classify the regression as a blocked deployment with actionable remediation, not a remote failure                      | R3        |
| Sui Move constraint       | Treat empty `modules` as an invalid publish payload regardless of dependency presence                                  | R4        |
| Regression coverage       | Extend executor, publisher, hook, and status-popup tests using existing deployment fixtures and flags                  | R5        |

## 1.6. Design Decisions

### 1.6.1. Shared Final Publish-Payload Gate in the Executor

The executor is the correct place for the primary guard because it is the last shared stage before remote and local publish implementations diverge. At that point the system already knows whether the deployment uses:

- deploy-grade compilation output (`DeployGradeCompileResult.modules`)
- artifact-backed local publishing (`GeneratedContractArtifact.bytecodeModules`)
- shim rebuild output for local publishing

This satisfies the spec requirement to stop the workflow before wallet approval and before network submission.

### 1.6.2. Publisher-Level Guard Rails Remain Mandatory

`publishRemote.ts` and `publishLocal.ts` still need explicit empty-payload preconditions immediately before `Transaction.publish()`. This is a defense-in-depth choice: even if a future caller bypasses the executor or a regression slips past the shared gate, publishers must not create a Sui Move publish transaction with `modules: []`.

### 1.6.3. Blocked Outcome Reuses Existing Deployment Review Surfaces

The feature should not introduce a new deployment outcome type. The existing `blocked` outcome, `DeploymentStatus`, `DeploymentReviewEntry`, and `DeploymentStatusMessage` contracts already model local readiness failures and can carry this regression cleanly. The new behavior is a better-classified blocked attempt, not a new lifecycle.

### 1.6.4. Payload Validation Must Run on the Final Materialized Module Set

The existing pre-deploy validation (`missing-bytecode`, stale artifact, wallet-required, invalid package references) happens too early to catch all empty-publish cases, especially after deploy-grade compilation or local module rebuilding. The new check must validate the final materialized module list that will actually be passed into Sui `Transaction.publish()`.

### 1.6.5. Scope Stays on Deployment Integrity, Not Compiler Recovery

This feature does not attempt to repair every path that could lead to empty modules. Its scope is to prevent malformed publish attempts, surface actionable remediation, and let the user retry after recompilation or refresh. Root-cause fixes inside compilation can be handled separately if later investigation identifies a deterministic compiler bug.

## 1.7. Constitution Re-Check (Post-Design)

| Principle                                     | Status | Notes                                                                                                        |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| I. Type Safety Above All                      | PASS   | Design stays within typed deployment contracts and explicit error/result codes.                              |
| V. Security by Default                        | PASS   | Invalid transactions are blocked before approval/submission, reducing exposure to malformed signed payloads. |
| VI. Test-First Quality                        | PASS   | Design explicitly adds regression tests across shared executor logic and publish endpoints.                  |
| IX. Artifact Integrity & Lifecycle Separation | PASS   | Compile readiness and deploy-time payload validation remain distinct but coordinated lifecycle checks.       |

No new violations detected.
