# Feature Specification: Verified Contract Deployment

**Feature Branch**: `012-real-contract-deployment`  
**Created**: 2026-03-22  
**Status**: Draft  
**Input**: User description: "a solution that will close the loop, so that we can actively deploy contracts to a local chain, or the remote and remove the mocked deployments. I want to emphasize correctness and testability."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Deploy a compiled contract to a real target (Priority: P1)

A user with a valid compiled contract wants to deploy directly from the editor to either a local chain or a supported remote target and receive a result that reflects the actual target response rather than a simulated success.

**Why this priority**: This is the missing end-to-end loop. Without a real deployment path, the product stops at compilation and cannot prove that generated contracts are usable in an actual environment.

**Independent Test**: Can be fully tested by starting from a successfully compiled contract, selecting `local` and then a supported remote target in separate runs, completing deployment, and verifying that each run produces a target-confirmed result with deployment evidence.

**Acceptance Scenarios**:

1. **Given** a current compiled contract is available and the local target is ready, **When** the user selects `local` and starts deployment, **Then** the system submits the contract to the local chain and reports the confirmed deployment result for that target.
2. **Given** a current compiled contract is available and the user has access to a supported remote target, **When** the user selects that remote target and completes the required approval flow, **Then** the system reports the confirmed deployment result returned by that target.
3. **Given** deployment finishes successfully, **When** the final status is shown, **Then** the user sees the selected target, resulting package identifier, and a confirmation reference for that specific deployment attempt.

---

### User Story 2 - Be protected from incorrect or ambiguous deployments (Priority: P1)

A user needs the system to prevent deployments that are stale, misconfigured, unauthorized, mismatched to the chosen target, or otherwise unsafe, and to avoid ever presenting a simulated or unconfirmed result as a successful deployment.

**Why this priority**: Correctness matters more than throughput for contract deployment. A false success or wrongly targeted deployment would undermine trust in the generated contracts and in the editor itself.

**Independent Test**: Can be fully tested by exercising stale artifact, missing prerequisites, rejected approval, submission failure, and missing-confirmation scenarios and verifying that none of them are reported as successful deployments.

**Acceptance Scenarios**:

1. **Given** the compiled artifact is stale, incomplete, or missing required deployment prerequisites, **When** the user starts deployment, **Then** the system blocks the attempt before submission and explains what must be corrected.
2. **Given** the user rejects a required approval or signing step, **When** deployment stops, **Then** the attempt is recorded as cancelled and not as a successful deployment.
3. **Given** a deployment is submitted but the system cannot confirm the final result from the selected target, **When** the workflow ends, **Then** the system marks the attempt as unresolved or failed and instructs the user how to verify or retry it.

---

### User Story 3 - Review deployment evidence and retry confidently (Priority: P2)

A user wants to inspect what happened during the latest deployment attempt, understand whether it succeeded, failed, or was cancelled, and retry from a known state without guessing which artifact or target was used.

**Why this priority**: Testability depends on repeatable evidence. Users need to see enough deployment context to verify outcomes, compare retries, and diagnose whether a problem is with the artifact, the target, or the approval path.

**Independent Test**: Can be fully tested by performing multiple deployment attempts with different outcomes and verifying that the latest result and recent history remain understandable and distinguishable.

**Acceptance Scenarios**:

1. **Given** a deployment attempt finishes with any terminal outcome, **When** the user reviews deployment status surfaces, **Then** the system shows the artifact identity, selected target, final outcome, final stage, and any resulting deployment identifiers or remediation guidance.
2. **Given** a user retries deployment after a blocker or failure, **When** the next attempt finishes, **Then** the system clearly distinguishes the new attempt from the earlier one and preserves enough recent history to compare outcomes.
3. **Given** the user closes the active progress view while deployment is still running, **When** the attempt completes later, **Then** the final outcome remains available from the persistent review surfaces.

### Edge Cases

- A user starts deployment with a valid artifact, but the graph changes before confirmation arrives. The active attempt must remain tied to the originally deployed artifact, and later UI state must not imply that the newer graph version was deployed.
- A target accepts submission but does not return final confirmation in time. The system must not report success without confirmation and must tell the user how to continue verification.
- A user deploys the same artifact to multiple targets in succession. Each attempt must keep its own target-specific result and not overwrite the evidence for the other target.
- The local chain is selected but has been reset since the last deployment. The system must treat prior local deployment evidence as historical only and validate the new attempt independently.
- A previously available remote target becomes unavailable after target selection but before submission. The attempt must stop with a target-specific failure rather than silently redirecting or retrying elsewhere.
- Any user-facing deployment flow that still relies on simulated success data must be treated as incomplete and not eligible to satisfy this feature.

## Requirements _(mandatory)_

### Functional Requirements

#### Real deployment execution

- **FR-001**: The system MUST allow the user to deploy the current compiled contract to `local`, `testnet:stillness`, or `testnet:utopia` from within the editor.
- **FR-002**: The system MUST execute deployments against the user-selected target's real deployment flow in normal product usage.
- **FR-003**: The system MUST NOT generate fabricated package identifiers, fabricated confirmation references, or simulated success states for normal user deployments.
- **FR-004**: The system MUST bind each deployment attempt to a specific compiled artifact and selected target before submission begins.
- **FR-005**: The system MUST prevent a second deployment attempt from starting for the same workspace while another attempt is still in progress.

#### Correctness and validation

- **FR-006**: The system MUST verify that a current, deployable compiled artifact exists before allowing deployment to begin.
- **FR-007**: The system MUST block deployment when the artifact no longer matches the current graph state.
- **FR-008**: The system MUST verify target-specific prerequisites before submission, including target availability, required user access, and target compatibility checks.
- **FR-009**: The system MUST validate the target-specific reference data needed for deployment before submission to a remote target.
- **FR-010**: The system MUST treat missing, invalid, outdated, or incompatible target reference data as a deployment blocker.
- **FR-011**: The system MUST classify each deployment attempt as one of: blocked, cancelled, in progress, failed, unresolved pending verification, or succeeded.
- **FR-012**: The system MUST only classify an attempt as succeeded after receiving final confirmation from the selected target.
- **FR-013**: The system MUST NOT downgrade or reinterpret a failed, cancelled, or unresolved attempt as successful without a new confirmed deployment attempt.

#### Deployment evidence and feedback

- **FR-014**: The system MUST show user-readable progress stages for an active deployment attempt.
- **FR-015**: The system MUST expose the final stage reached for every non-success terminal outcome.
- **FR-016**: The system MUST show the selected target, artifact identity, and final outcome for the latest deployment attempt in persistent review surfaces.
- **FR-017**: For every successful deployment, the system MUST show the resulting package identifier and confirmation reference returned for that attempt.
- **FR-018**: For every blocked, cancelled, failed, or unresolved attempt, the system MUST provide a user-actionable explanation of what happened and what to do next.
- **FR-019**: Dismissing the active progress view MUST NOT cancel an in-flight deployment attempt or erase its final outcome.
- **FR-020**: The system MUST preserve a recent, session-visible history of deployment attempts so users can distinguish the latest result from earlier attempts.

#### Testability and verification

- **FR-021**: The product MUST support repeatable verification of successful local deployment, successful remote deployment, blocked deployment, cancelled deployment, failed deployment, and unresolved deployment outcomes.
- **FR-022**: The local deployment path MUST be verifiable in a project-controlled environment without relying on a remote target.
- **FR-023**: The remote deployment path MUST be verifiable against at least one supported non-local target using the same user-facing workflow as normal deployment.
- **FR-024**: The evidence shown for a deployment attempt MUST be sufficient for a tester or operator to determine which artifact was deployed, where it was deployed, and whether the result was confirmed.

### Key Entities _(include if feature involves data)_

- **Deployment Target**: A named destination chosen by the user from `local`, `testnet:stillness`, or `testnet:utopia`.
- **Compiled Artifact**: The deployable contract output associated with a specific graph revision.
- **Deployment Attempt**: One end-to-end run from validation through final outcome for a single artifact and target.
- **Deployment Evidence**: The user-visible record of an attempt, including artifact identity, target, timestamps, outcome, final stage, package identifier, confirmation reference, and remediation guidance when relevant.
- **Target Reference Data**: The maintained target-specific information required to validate and prepare a remote deployment attempt.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of successful user-visible deployments are backed by a target-confirmed result and never by simulated success data.
- **SC-002**: 100% of blocked, cancelled, failed, and unresolved deployment attempts are surfaced with the selected target, terminal stage, and a next-step message.
- **SC-003**: A prepared user can complete a successful local deployment from a valid compiled artifact in 3 minutes or less.
- **SC-004**: A prepared user can complete a successful deployment to at least one supported remote target in 5 minutes or less, excluding time spent waiting on user approval or external network congestion.
- **SC-005**: 95% of successful deployments display the resulting package identifier and confirmation reference within 10 seconds of target confirmation being available to the application.
- **SC-006**: Every supported deployment outcome class has at least one repeatable acceptance test path that passes without manual code changes to the product.
- **SC-007**: Re-running the same predefined deployment verification scenario five consecutive times yields the same final outcome classification in all five runs.

### Assumptions

- The supported deployment targets for this feature remain `local`, `testnet:stillness`, and `testnet:utopia`.
- Users attempting remote deployment have the necessary authority, wallet access, and target permissions outside the scope of this feature.
- A usable local chain environment can be started and made available separately from the editor.
- Published target reference data remains the authoritative source for the supported remote targets.
- Simulated deployment behavior may continue to exist only in isolated test harnesses, but it does not satisfy normal end-user deployment requirements for this feature.
