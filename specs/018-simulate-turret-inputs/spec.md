# Feature Specification: Turret Input Simulation

**Feature Branch**: `[018-simulate-turret-inputs]`  
**Created**: 2026-03-29  
**Status**: Draft  
**Input**: User description: "Add a button next to each turret in the Authorize tab that opens a simulation modal for extension inputs; pre-fill as many fields as possible and autocomplete any remaining fields from GraphQL data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open A Turret Simulation (Priority: P1)

An operator reviewing owned turrets in the Authorize tab can launch a simulation for a specific turret directly from that turret's row, so they can inspect how the deployed extension would respond before attempting live in-game validation.

**Why this priority**: The main value is reducing uncertainty around whether an authorized extension is behaving correctly for a selected turret. Without a direct row-level entry point, operators still need external scripts and object IDs to test behavior.

**Independent Test**: Can be fully tested by opening the Authorize tab with at least one turret, launching the simulation modal from a row action, and confirming that the modal opens with the selected turret and active deployment context already attached.

**Acceptance Scenarios**:

1. **Given** the Authorize tab shows owned turrets for an active deployment, **When** the operator activates the simulation control beside a turret, **Then** the system opens a simulation modal scoped to that turret.
2. **Given** the simulation modal is opened from a turret row, **When** the modal renders, **Then** it shows the selected turret identity and the active deployment identity without requiring the operator to re-enter them.
3. **Given** the selected deployment or turret list changes while the modal is open, **When** the prior context is no longer valid, **Then** the modal prevents running a stale simulation and prompts the operator to refresh or reopen with current data.

---

### User Story 2 - Review And Complete Inputs Quickly (Priority: P2)

An operator can review a nearly complete candidate-input form in the modal, with fields pre-populated from the selected turret, active deployment, connected wallet context, and existing remote world data, so they only need to adjust the specific candidate conditions they want to test.

**Why this priority**: The simulation is only practical if operators do not have to manually reconstruct world state for every test run. Fast prefill and completion is the core usability requirement.

**Independent Test**: Can be fully tested by opening the modal and confirming that known context fields are pre-populated, unresolved fields offer suggested completions from available remote data, and the operator can still override values before running a simulation.

**Acceptance Scenarios**:

1. **Given** the modal has access to turret, deployment, and wallet context already loaded in the Authorize flow, **When** the modal opens, **Then** those known values are pre-filled automatically.
2. **Given** a required simulation field cannot be derived from the current page state, **When** remote world data can supply likely values, **Then** the modal offers those values through autocomplete rather than leaving the operator to guess raw identifiers.
3. **Given** a field was pre-filled or suggested automatically, **When** the operator needs to test a different case, **Then** they can replace the proposed value before submitting the simulation.

---

### User Story 3 - Inspect Simulation Outcomes Safely (Priority: P3)

An operator can run the simulation and review the extension's returned targeting output and any validation or lookup failures in the same modal, so they can decide whether the deployed extension matches their expectations without changing on-chain state.

**Why this priority**: The modal is only useful if it closes the loop by showing the simulated result, not just collecting inputs.

**Independent Test**: Can be fully tested by submitting valid and invalid simulation inputs and confirming that the modal shows the returned target-priority output for successful runs and actionable error feedback for failed runs.

**Acceptance Scenarios**:

1. **Given** a complete set of simulation inputs, **When** the operator runs the simulation, **Then** the modal displays the returned target-priority result for that turret and input set.
2. **Given** the simulation cannot run because prerequisite data is missing or the evaluation fails, **When** the request completes, **Then** the modal keeps the current inputs visible and explains what prevented a valid result.
3. **Given** an operator wants to compare multiple cases for the same turret, **When** they adjust inputs and rerun the simulation, **Then** the modal allows repeated runs without requiring them to reopen the Authorize tab row action each time.

---

### Edge Cases

- The selected turret is no longer available because the wallet, deployment target, or owned-turret list changed after the modal opened.
- Remote data needed for completion is unavailable, incomplete, or returns multiple plausible matches for a field.
- The turret is present in the list but cannot be simulated because the active deployment context is missing, stale, or no longer matches the turret's current extension state.
- The simulation succeeds but returns an empty target-priority list, which must be surfaced as a valid outcome rather than a generic failure.
- The operator edits pre-filled values into an invalid combination, such as using candidate data that conflicts with the selected turret context.

## Assumptions

- The feature is scoped to turrets that already appear in the Authorize tab for a published deployment target.
- The modal is launched for one turret at a time from its list row rather than as a bulk action across multiple turrets.
- Known turret and deployment context already visible in the Authorize flow should be reused as the first source of truth for prefill.
- When a required field cannot be derived from the current page state, the system may query the same remote world data sources already trusted by authorization workflows to suggest valid values.
- Running a simulation must not authorize, deploy, mutate, or otherwise change live on-chain state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Authorize tab MUST expose a simulation action for each turret row that is eligible to be inspected under the current deployment context.
- **FR-002**: Activating a turret's simulation action MUST open a modal that is explicitly scoped to that turret and the currently active deployment.
- **FR-003**: The modal MUST pre-fill every simulation field that can be derived from already loaded authorization context, including the selected turret identity and active deployment identity.
- **FR-004**: For each required simulation field that cannot be derived locally, the modal MUST provide autocomplete suggestions from available remote world data before requiring fully manual entry.
- **FR-005**: The system MUST clearly distinguish between fields that were pre-filled, fields that were suggested from remote data, and fields that still require operator input.
- **FR-006**: Operators MUST be able to review and override pre-filled or suggested values before running a simulation.
- **FR-007**: The system MUST validate that all required inputs are present and internally consistent before starting the simulation.
- **FR-008**: The simulation workflow MUST evaluate the deployed extension for the selected turret without mutating live authorization or deployment state.
- **FR-009**: After a successful simulation, the modal MUST display the returned targeting output in a form that lets the operator understand which targets would be selected and in what order or weight.
- **FR-010**: After an unsuccessful simulation, the modal MUST preserve the operator's current inputs and show an error state that identifies whether the failure came from missing data, remote lookup failure, invalid input, or simulation execution failure.
- **FR-011**: The modal MUST support repeated simulation runs for the same turret during one session so operators can compare changed inputs without reopening the row action.
- **FR-012**: If the selected turret or deployment context becomes stale while the modal is open, the system MUST block further simulation runs until the operator refreshes or reopens with current data.
- **FR-013**: The feature MUST not interrupt or regress the existing row selection, authorization batching, or active-deployment display workflows in the Authorize tab.
- **FR-014**: The feature MUST remain usable when remote completion data is partially unavailable by allowing manual entry for any unresolved field.

### Key Entities *(include if feature involves data)*

- **Turret Simulation Session**: A row-scoped evaluation workflow bound to one turret and one active deployment, including modal state, resolved inputs, and the latest outcome.
- **Simulation Input Draft**: The editable set of extension input values assembled from pre-filled context, remote suggestions, and operator overrides before a run is submitted.
- **Input Suggestion Source**: Metadata describing where a field value came from, such as existing authorize-tab context, remote world data, or direct operator entry.
- **Simulation Result**: The outcome returned by the extension evaluation, including any target-priority entries, empty-list outcomes, and failure details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability testing with authorized turrets available, operators can open the simulation modal for a chosen turret and reach a runnable input set in under 30 seconds without leaving the Authorize tab.
- **SC-002**: At least 80% of required simulation fields are pre-filled or suggested automatically for the common case where the turret, deployment, and wallet context are already loaded in the Authorize flow.
- **SC-003**: Operators can successfully complete a simulation run for a selected turret on the first attempt in at least 90% of cases where remote data sources are available and the deployment context is valid.
- **SC-004**: Operators can distinguish successful empty-result simulations from actual failures with no more than one clarification question during moderated testing.
