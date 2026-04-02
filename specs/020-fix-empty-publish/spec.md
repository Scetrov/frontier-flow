# 1. Feature Specification: Prevent Empty Publish Deployment

**Feature Branch**: `020-fix-empty-publish`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Since release 0.9.9, deployment can fail with a publish transaction whose module list is empty, producing the chain error 'TransferObjects, MergeCoin, and Publish cannot have empty arguments'."

## 1.1. User Scenarios & Testing *(mandatory)*

### 1.1.1. User Story 1 - Deploy a Prepared Contract Successfully (Priority: P1)

A user who has built a valid graph and is ready to deploy can complete deployment without the product generating an invalid publish transaction.

**Why this priority**: Deployment is a core promise of Frontier Flow. If valid contracts cannot be published reliably, the visual programming workflow fails at its most important handoff.

**Independent Test**: Open a deployment-ready contract, start deployment on a supported target, approve any required signing step, and verify that the deployment proceeds without producing a publish command whose module list is empty.

**Acceptance Scenarios**:

1. **Given** a user has a deployment-ready contract with publishable package content, **When** they start deployment, **Then** the system submits a publish transaction only after confirming the publish payload is populated.
2. **Given** a user starts deployment for a valid contract, **When** the deployment reaches submission, **Then** the publish transaction contains the contract package content needed for the chain to accept the publish command.
3. **Given** a deployment completes successfully, **When** the user reviews the outcome, **Then** the result surface shows the deployment as successful and includes the resulting package identifier.

---

### 1.1.2. User Story 2 - Block Invalid Publish Attempts Before Submission (Priority: P1)

A user whose deployment package is missing or incomplete is stopped before any malformed publish transaction is signed or submitted, and receives a clear explanation of what must be corrected.

**Why this priority**: Preventing invalid submission avoids wasted signing prompts, confusing chain errors, and loss of trust in the deployment workflow.

**Independent Test**: Force a deployment state where publish package content is unavailable, attempt deployment, and verify that the system blocks submission locally with actionable guidance instead of sending the malformed transaction.

**Acceptance Scenarios**:

1. **Given** a deployment attempt has no publishable module content, **When** the user starts deployment, **Then** the system blocks the attempt before wallet approval or network submission.
2. **Given** deployment is blocked because package content is missing, **When** the system presents the failure, **Then** the message explains that deployment data is incomplete and tells the user to regenerate or refresh the deployable contract package.
3. **Given** deployment is blocked locally, **When** the user opens deployment review surfaces, **Then** the blocked attempt is recorded as a local readiness failure rather than a chain submission failure.

---

### 1.1.3. User Story 3 - Recover and Retry in the Same Session (Priority: P2)

A user who hits the empty-publish regression can correct the contract state, retry deployment, and complete the publish flow without re-creating the graph from scratch.

**Why this priority**: Recovery determines whether the regression is a temporary interruption or a workflow-ending blocker.

**Independent Test**: Block one deployment because package content is missing, restore a valid deployable contract state, retry deployment in the same session, and verify the next attempt can complete successfully.

**Acceptance Scenarios**:

1. **Given** a user receives a blocked deployment due to missing publish content, **When** they regenerate the deployable contract state and retry, **Then** the next attempt re-checks readiness and can proceed normally.
2. **Given** a user encountered a blocked attempt earlier in the session, **When** they later succeed, **Then** the deployment review surfaces preserve the earlier blocked attempt and the later success as distinct outcomes.
3. **Given** a deployment is blocked before submission, **When** the user remains on the canvas, **Then** their graph, selected target, and unsent work remain unchanged.

### 1.1.4. Edge Cases

- A publish transaction must be blocked if dependency information exists but the publishable module list is empty.
- A deployment attempt must fail locally if previously prepared contract data becomes stale, missing, or unreadable between build completion and deploy initiation.
- Switching deployment targets after a blocked attempt must not reuse invalid publish package content silently.
- Dismissing a blocked deployment message must not clear the user’s graph, target selection, or latest valid deployment result.
- If readiness appears valid initially but publish data becomes incomplete immediately before submission, the system must re-check and block the malformed attempt.

## 1.2. Requirements *(mandatory)*

### 1.2.1. Functional Requirements

- **FR-001**: The system MUST verify that a deployment attempt has non-empty publishable contract package content before any publish transaction is signed or submitted.
- **FR-002**: The system MUST block deployment locally when the publishable contract package content is empty, missing, or otherwise incomplete.
- **FR-003**: The system MUST NOT request wallet approval for a deployment attempt that has already failed local publish-payload validation.
- **FR-004**: The system MUST NOT submit a publish transaction whose publish command lacks contract package content.
- **FR-005**: When deployment is blocked for missing publish content, the system MUST present a user-facing explanation that identifies the issue as incomplete deployment package data rather than exposing only the raw chain parser error.
- **FR-006**: The blocked-state guidance MUST tell the user what corrective action to take before retrying deployment.
- **FR-007**: The system MUST preserve the active graph, current deployment target, and current session state when a deployment attempt is blocked before submission.
- **FR-008**: The system MUST allow the user to retry deployment after the deployable contract state has been regenerated or refreshed.
- **FR-009**: Every retry MUST perform the same publish-payload readiness validation again and MUST NOT rely on a previously failed readiness result.
- **FR-010**: Deployment review surfaces MUST distinguish a locally blocked publish-payload failure from wallet rejection, network failure, and successful submission.
- **FR-011**: The system MUST record enough detail about a blocked attempt for the user to understand which stage failed and why.
- **FR-012**: Valid deployments that include complete publishable contract package content MUST continue through the existing publish flow without added manual steps.
- **FR-013**: Existing success messaging, package identifier display, and session history behavior for successful deployments MUST remain available after this fix.
- **FR-014**: If deployment package data becomes invalid after earlier readiness work but before final submission, the system MUST detect that condition before sending the publish transaction.
- **FR-015**: The system SHOULD surface deployment readiness problems quickly enough that users are not left waiting on a doomed attempt.

### 1.2.2. Key Entities *(include if feature involves data)*

- **Deployment Package**: The user’s prepared contract publish payload for the current graph and target, including the publishable contract content required to construct a valid deployment attempt.
- **Deployment Readiness State**: The current assessment of whether the active graph has all prerequisite data needed to proceed to signing and submission.
- **Deployment Attempt**: A single user-initiated deployment action with a target, stage progression, outcome, and user-visible review history.
- **Blocked Deployment Outcome**: A recorded deployment result that ends before submission because required deployment data was incomplete or invalid.

## 1.3. Success Criteria *(mandatory)*

### 1.3.1. Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of deployment attempts with empty publishable contract content are blocked before wallet approval or network submission.
- **SC-002**: In acceptance testing, 100% of valid deployment attempts continue to submission without producing the empty-publish chain error.
- **SC-003**: Users receive a clear blocked-deployment explanation within 3 seconds of initiating an invalid attempt on a standard development machine.
- **SC-004**: In regression testing, 100% of blocked attempts remain visible in deployment review history with the correct failure stage and a user-actionable reason.
- **SC-005**: In recovery testing, at least 95% of users who encounter the blocked state can correct the issue and complete a successful retry in the same session without recreating their graph.
- **SC-006**: Existing successful deployment flows retain their current completion rate and do not add extra confirmation steps for valid publish attempts.

## 1.4. Assumptions

- The regression is caused by deployment proceeding with incomplete publishable contract package content rather than by a target-specific chain rule change.
- Users already rely on the existing deployment review surfaces to understand blocked, cancelled, failed, and successful attempts.
- The contract package can be regenerated or refreshed within the current session without forcing the user to rebuild the graph manually.

## 1.5. Dependencies & Constraints

- The feature must preserve current deployment target options and the established deployment-stage review experience.
- Wallet prompts and network submission are downstream dependencies and must only occur after local readiness validation passes.
- The solution must avoid regressing existing successful deploy flows for local and published targets.