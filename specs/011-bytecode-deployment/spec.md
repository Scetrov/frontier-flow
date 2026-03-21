# Feature Specification: Bytecode Deployment Targets

**Feature Branch**: `011-bytecode-deployment`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: User description: "I would like to get started writing the spec to deploy the compiled bytecode to stillness, this will need to mitigate any deployment blockers, and you can fetch information about the package IDs from <https://docs.evefrontier.com/tools/resources> available in `./data/resource.md`.

We will need a drop down to select the deployment target `["local", "testnet:stillness", "testnet:utopia"]` I suggest this be integrated into a button next to build, any deployment error messages should be included in the popup in the status bar, we will also need some kind of deployment modal that shows a progress bar."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Deploy compiled output to a selected target (Priority: P1)

A user with a valid compiled contract wants to deploy it without leaving the editor. The user can choose a deployment target from a deploy control placed next to Build, review the selected destination, start deployment, and receive clear completion feedback including the deployed package identifier.

**Why this priority**: Deployment is the user-visible outcome of compilation. Without it, the build pipeline stops short of delivering usable contracts to the intended environment.

**Independent Test**: Can be fully tested by starting from a successfully compiled contract, selecting each supported target, initiating deployment, and verifying that the system submits the deployment to the chosen environment and returns the resulting package identifier or a user-actionable failure.

**Acceptance Scenarios**:

1. **Given** a valid compiled contract is available, **When** the user opens the deploy control next to Build and selects `local`, **Then** the selected target is shown before deployment starts and the deployment is routed to the local environment.
2. **Given** a valid compiled contract is available, **When** the user selects `testnet:stillness` or `testnet:utopia` and confirms deployment, **Then** the deployment is sent to the selected target and the resulting package identifier is shown after success.
3. **Given** deployment completes successfully, **When** the status updates, **Then** the user sees a success message that includes the deployment target and package identifier.

---

### User Story 2 - Be stopped early by deployment blockers with actionable guidance (Priority: P1)

A user attempts deployment when something required is missing or invalid, such as no compiled artifact, no connected wallet, incompatible network, missing package metadata, rejected signing, or a target-specific dependency issue. The system blocks the deployment before or during submission, explains the blocker in plain language, and tells the user what to do next.

**Why this priority**: Preventing opaque failures is essential for a deployment workflow. Users need blocker detection before spending time in a broken deploy attempt.

**Independent Test**: Can be fully tested by simulating each blocker condition and verifying that deployment is prevented or halted safely, the blocker reason appears in the status popup, and the user is given a clear remediation path.

**Acceptance Scenarios**:

1. **Given** no successful compilation exists for the current graph, **When** the user tries to deploy, **Then** deployment does not start and the status popup explains that a valid compiled artifact is required.
2. **Given** the selected target requires account access that is not currently available, **When** the user tries to deploy, **Then** deployment does not proceed and the status popup identifies the missing prerequisite.
3. **Given** the target-specific package reference data is unavailable, outdated, or incompatible with the selected target, **When** deployment validation runs, **Then** deployment is blocked and the popup identifies the package reference issue.
4. **Given** the user rejects the signing or approval step, **When** the deployment flow is interrupted, **Then** the system marks the deployment as cancelled rather than successful and explains that user approval was not granted.

---

### User Story 3 - Track deployment progress in a dedicated modal (Priority: P2)

A user wants to understand what the deployment is doing after it starts. The system opens a deployment modal with a progress bar and stage updates so the user can follow validation, preparation, signing, submission, and confirmation without guessing whether the workflow is stalled.

**Why this priority**: Deployment can involve multiple external steps and waiting periods. Visible progress reduces uncertainty and gives the user confidence that the system is still working.

**Independent Test**: Can be fully tested by starting a deployment and verifying that the modal opens automatically, displays a progress bar, advances through stages in order, and closes or updates appropriately on success, failure, or cancellation.

**Acceptance Scenarios**:

1. **Given** deployment begins, **When** the system transitions into active deployment, **Then** a deployment modal opens and shows a progress bar with the current stage.
2. **Given** deployment advances through its stages, **When** each stage completes, **Then** the progress display updates in sequence and remains understandable without technical knowledge.
3. **Given** deployment fails or is cancelled after it has started, **When** the modal updates, **Then** the final stage shown reflects the failure or cancellation and directs the user to the status popup for the detailed message.

---

### User Story 4 - Review deployment errors from the status bar popup (Priority: P2)

A user needs a consistent place to inspect deployment failures after an error occurs. The status bar popup includes deployment error messages, target context, and enough detail to decide whether the issue is a user action problem, a network problem, or a target-configuration problem.

**Why this priority**: Error details must stay accessible after the modal closes or changes state. A persistent status surface reduces repeated failed attempts and support overhead.

**Independent Test**: Can be fully tested by triggering representative deployment failures and verifying that the status bar popup captures the failure message, the affected target, and a concise remediation message.

**Acceptance Scenarios**:

1. **Given** deployment validation fails before submission, **When** the user opens the status bar popup, **Then** the popup lists the failure reason and the affected target.
2. **Given** deployment fails after submission begins, **When** the user opens the status bar popup, **Then** the popup shows the latest deployment error message and indicates at which stage the failure occurred.
3. **Given** a later deployment succeeds after an earlier failure, **When** the user checks the popup, **Then** the latest deployment result is shown without losing the ability to understand why the prior attempt failed during that session.

### Edge Cases

- What happens when the user changes the deployment target after a successful build but before deployment starts? The system re-validates target-specific prerequisites before allowing deployment to continue.
- What happens when the selected target cannot be reached or does not respond in time? The deployment stops with a target-specific connectivity error and the user is told to retry or change target.
- What happens when the compiled artifact is older than the current graph state? The system blocks deployment until the user rebuilds or otherwise refreshes the compiled output.
- What happens when the external package reference list for Stillness or Utopia changes between sessions? The system validates the selected target against the latest known reference data and reports a mismatch as a blocker.
- What happens when the user closes the progress modal while deployment is still running? The deployment continues, and current state remains accessible from the status bar popup.
- What happens when `local` is selected but the local deployment endpoint or configuration is missing? The system blocks deployment and explains that the local target is not ready.

## Requirements _(mandatory)_

### Functional Requirements

#### Deployment initiation and target selection

- **FR-001**: The system MUST provide a deployment control adjacent to Build.
- **FR-002**: The deployment control MUST allow the user to choose exactly one target from `local`, `testnet:stillness`, and `testnet:utopia` before deployment starts.
- **FR-003**: The system MUST clearly show the currently selected deployment target before the user confirms deployment.
- **FR-004**: The system MUST use the selected target, and only the selected target, for the active deployment attempt.
- **FR-005**: The system MUST prevent a new deployment from starting while another deployment attempt for the same workspace is already in progress.

#### Deployment readiness and blocker mitigation

- **FR-006**: The system MUST verify that a successful compiled artifact exists for the current graph before allowing deployment to start.
- **FR-007**: The system MUST block deployment when the compiled artifact is stale relative to the current graph state.
- **FR-008**: The system MUST verify that the user has satisfied all target access prerequisites required for the selected destination before deployment starts.
- **FR-009**: The system MUST validate target-specific package reference data before deployment begins.
- **FR-010**: The system MUST use maintained package reference data for `testnet:stillness` and `testnet:utopia` derived from the published EVE Frontier resources page.
- **FR-011**: The system MUST treat missing, outdated, or incompatible target package reference data as a deployment blocker.
- **FR-012**: The system MUST block deployment when the selected target is unavailable, misconfigured, or unreachable at validation time.
- **FR-013**: The system MUST distinguish between pre-deployment blockers, user-cancelled actions, submission failures, and confirmation failures.

#### Deployment progress and user feedback

- **FR-014**: Starting deployment MUST open a dedicated deployment modal.
- **FR-015**: The deployment modal MUST include a visible progress bar.
- **FR-016**: The deployment modal MUST present deployment progress as a sequence of user-readable stages.
- **FR-017**: The deployment modal MUST update the current stage as the workflow advances.
- **FR-018**: The deployment modal MUST present a terminal state for success, failure, or cancellation.
- **FR-019**: The deployment workflow MUST continue to report progress even if the user dismisses the modal after deployment has started.

#### Status bar popup and deployment messaging

- **FR-020**: Deployment error messages MUST be included in the status bar popup.
- **FR-021**: Each deployment error message shown in the status bar popup MUST identify the selected target.
- **FR-022**: Each deployment error message shown in the status bar popup MUST include a user-actionable explanation of the blocker or failure.
- **FR-023**: When deployment fails after progress has begun, the status bar popup MUST indicate the most recent completed or failed stage.
- **FR-024**: When deployment succeeds, the status bar popup MUST show a success message that includes the selected target and resulting package identifier.

#### Deployment result handling

- **FR-025**: The system MUST capture and display the resulting package identifier for every successful deployment.
- **FR-026**: The system MUST preserve enough deployment result context during the active session for the user to review the latest attempt outcome from the status surfaces.
- **FR-027**: The system MUST not mark a deployment as successful unless confirmation of completion has been received from the selected target flow.

### Key Entities

- **Deployment Target**: A named deployment destination chosen by the user from `local`, `testnet:stillness`, or `testnet:utopia`.
- **Compiled Artifact**: The deployable output produced by a successful build for the current graph revision.
- **Deployment Attempt**: A single end-to-end deployment run, including validation, preparation, approval, submission, and final outcome.
- **Deployment Blocker**: Any unmet prerequisite or incompatible condition that prevents deployment from starting or completing safely.
- **Package Reference Data**: Target-specific identifiers and related metadata required to validate or complete deployment for a given environment.
- **Deployment Status Message**: A user-facing success, warning, cancellation, or failure message shown in the status surfaces.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of supported deployment attempts require an explicit target selection from the allowed list before submission begins.
- **SC-002**: 100% of deployments blocked by missing prerequisites are stopped before submission and surfaced with a user-actionable explanation.
- **SC-003**: 95% of successful deployments show a visible progress transition within 2 seconds of the user starting deployment.
- **SC-004**: 100% of successful deployments show the resulting package identifier and selected target in the final success state.
- **SC-005**: 100% of deployment failures expose an error message in the status bar popup that identifies both the target and the failure stage.
- **SC-006**: Users can complete a successful deployment to any supported target in 3 minutes or less, excluding external approval wait time.
- **SC-007**: At least 90% of deployment-blocker scenarios can be resolved by the user without leaving the application, based on usability testing of the provided guidance.

### Assumptions

- The deployment flow builds on an existing successful compile/build capability and does not redefine how compiled artifacts are produced.
- The supported target labels remain exactly `local`, `testnet:stillness`, and `testnet:utopia` in the user interface for this feature.
- The EVE Frontier resources page is the authoritative published source for current Stillness and Utopia package reference data.
- The published resource data currently includes distinct package identifiers for Stillness and Utopia, including a World Package identifier for each target, and these values may change over time.
- `local` deployment depends on a separately available local environment and may require configuration that is not present by default in every user session.
- The status bar popup is an existing status surface that can present deployment-specific messages alongside compile/build status.
