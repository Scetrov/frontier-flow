# Feature Specification: Turret Extension Authorization

**Feature Branch**: `013-turret-authorize`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "Authorize feature that authorizes the contract once deployed on selected turrets, using the EVE Frontier world-contracts authorization pattern and GraphQL for data fetching."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Persist Deployment State Across Reloads (Priority: P1)

After a user compiles and deploys a contract, the compiled bytecode, deployment result (package ID, target, transaction digest), and associated metadata are preserved in local storage. When the user reloads the browser, the application restores this state so that re-deployment is not required.

**Why this priority**: Without persistent deployment state, the entire authorization flow is blocked after a page reload because the system has no record of the deployed package. This is the foundational prerequisite for every other story.

**Independent Test**: Deploy a contract, reload the page, confirm the deployment state is restored and the Authorize tab is enabled.

**Acceptance Scenarios**:

1. **Given** a contract has been successfully deployed, **When** the user reloads the page, **Then** the deployment status shows "deployed" with the original package ID, target, and transaction reference.
2. **Given** no contract has been deployed, **When** the user reloads the page, **Then** the deployment status shows the appropriate pre-deployment state (idle/blocked/ready) and the Authorize tab remains disabled.
3. **Given** deployment state exists in local storage from a previous session, **When** the application starts, **Then** the stored deployment state is loaded and validated before being applied.
4. **Given** the stored deployment state references a different contract name than the current graph, **When** the application loads, **Then** the stale deployment state is discarded and the user starts fresh.

---

### User Story 2 — Authorize Tab in Header Navigation (Priority: P1)

A third navigation tab labelled "Authorize" appears next to the existing "Visual" and "Move" tabs in the header. The tab has a distinctive icon (a shield or key motif, consistent with the existing icon style). The tab is disabled and visually muted until a contract has been successfully deployed. Once deployed, the tab becomes active and clickable.

**Why this priority**: The Authorize tab is the primary entry point for the entire authorization workflow. Without it, users have no way to access turret selection or trigger authorization.

**Independent Test**: Deploy a contract and confirm the Authorize tab transitions from disabled to enabled; click it and verify the Authorize view renders.

**Acceptance Scenarios**:

1. **Given** no contract has been deployed, **When** the header renders, **Then** the Authorize tab is visible but disabled (greyed out, not clickable), with a tooltip explaining why it is disabled (e.g. "Deploy a contract first").
2. **Given** a contract has been deployed successfully, **When** the header renders, **Then** the Authorize tab is enabled with its icon in the active colour palette.
3. **Given** the Authorize tab is enabled, **When** the user clicks it, **Then** the main content area switches to the Authorize view and the tab shows the active state indicator.
4. **Given** the user is on the Authorize tab and the deployment state is invalidated (e.g. user re-compiles and deploys a new version), **When** the deployment completes, **Then** the Authorize view refreshes to reflect the new deployment context.

---

### User Story 3 — View and Select Turrets for Authorization (Priority: P1)

When the user opens the Authorize tab, the system queries the EVE Frontier world via GraphQL to fetch all turrets owned by the connected wallet on the selected deployment server. Each turret is displayed as a selectable item in a list. Turrets that already have an extension authorized show which extension is currently applied. Each turret has a styled checkbox consistent with the existing tribe/ship selector pattern.

**Why this priority**: This is the core interaction surface — the user must be able to see their turrets, understand current extension state, and select which turrets to authorize.

**Independent Test**: Connect a wallet with turrets on a testnet, open the Authorize tab, and confirm all owned turrets are listed with correct extension status and selectable checkboxes.

**Acceptance Scenarios**:

1. **Given** a wallet is connected and a contract is deployed, **When** the user opens the Authorize tab, **Then** a loading state is shown while turrets are fetched.
2. **Given** turrets are fetched successfully, **When** the list renders, **Then** each turret displays its name/ID, and turrets with an existing extension show a badge or label indicating the current extension name/type.
3. **Given** a turret has no extension currently authorized, **When** it renders, **Then** its checkbox is unchecked and no extension badge is shown.
4. **Given** a turret already has the same extension authorized as the currently deployed contract, **When** it renders, **Then** it is visually marked as "already authorized" and its checkbox is pre-checked and disabled.
5. **Given** the wallet has no turrets on the selected server, **When** the Authorize tab loads, **Then** an empty state message is shown explaining that no turrets were found.
6. **Given** the GraphQL query fails (network error, server error), **When** the Authorize tab loads, **Then** an error state is shown with a retry option.

---

### User Story 4 — Authorize Extension on Selected Turrets (Priority: P1)

After selecting one or more turrets, the user confirms the selection. A progress dialog appears showing each turret being authorized sequentially. For each turret, the system constructs and submits a transaction that borrows the OwnerCap from the character, calls `authorize_extension` on the turret with the deployed contract's auth type, and returns the OwnerCap. The progress dialog updates in real time.

**Why this priority**: This is the culmination of the feature — actually applying the extension to turrets on-chain. Without this, the feature has no functional output.

**Independent Test**: Select turrets, confirm authorization, and verify on-chain transactions are submitted and the progress dialog tracks each turret's status.

**Acceptance Scenarios**:

1. **Given** one or more turrets are selected, **When** the user clicks "Authorize", **Then** a progress dialog opens showing each selected turret with a pending status indicator.
2. **Given** the authorization process is running, **When** a transaction is submitted for a turret, **Then** the dialog shows a "submitting" state for that turret.
3. **Given** a turret authorization transaction is confirmed on-chain, **When** the confirmation event is received, **Then** the turret's row in the progress dialog shows a green tick (checkmark) indicating success.
4. **Given** a turret authorization fails (wallet rejection, on-chain error), **When** the failure is detected, **Then** the turret's row shows a red error indicator with a brief error message, and the process continues to the next turret.
5. **Given** all selected turrets have been processed (success or failure), **When** the progress dialog completes, **Then** a summary is shown with counts of successful and failed authorizations, and a button to close the dialog.
6. **Given** the user closes the progress dialog after completion, **When** the dialog closes, **Then** the turret list refreshes to reflect the updated authorization state.

---

### User Story 5 — Event-Driven Confirmation of Authorization (Priority: P2)

Rather than optimistically marking turrets as authorized after transaction submission, the system listens for on-chain confirmation events. A turret is only marked with a green tick once the transaction has been confirmed and the authorization event has been observed.

**Why this priority**: This provides a higher confidence guarantee to the user. While the core authorization works without event listening (P1 stories use transaction confirmation), event-based confirmation adds reliability, especially for slow or congested networks.

**Independent Test**: Submit an authorization transaction, observe that the UI waits for event confirmation before showing the green tick, even if the transaction status returns first.

**Acceptance Scenarios**:

1. **Given** a turret authorization transaction has been submitted, **When** the transaction is confirmed but the event has not yet been observed, **Then** the turret shows a "confirming" state (not yet green-ticked).
2. **Given** the on-chain authorization event is received for a turret, **When** the event is processed, **Then** the turret transitions to a green tick "confirmed" state.
3. **Given** a transaction is confirmed but the event is not received within a reasonable timeout, **When** the timeout elapses, **Then** the turret shows a warning state indicating confirmation could not be verified, with an option to retry or manually check.

---

### Edge Cases

- What happens when the user's wallet is disconnected mid-authorization? The in-progress authorization should pause, show a "wallet disconnected" warning, and allow resumption once reconnected.
- What happens when the user switches deployment targets while on the Authorize tab? The turret list should clear and re-fetch for the new target, and any in-progress authorization should be cancelled.
- What happens when a turret is brought offline or destroyed between fetching the list and authorizing? The authorization transaction will fail for that turret; the error should be caught and displayed, and remaining turrets should continue.
- What happens when the deployed contract's module name changes after recompilation? The stored deployment state should be invalidated, forcing the user to re-deploy before authorizing.
- What happens when there are many turrets (50+)? The turret list should support scrolling and maintain performance; the authorization process should handle sequential transactions gracefully without UI freezing.
- What happens when the user attempts to authorize a turret that already has a different extension? The turret should be authorizable (overwriting the previous extension), but the UI should clearly warn that the existing extension will be replaced.

## Requirements *(mandatory)*

### Functional Requirements

#### Deployment State Persistence

- **FR-001**: System MUST persist the deployment result (package ID, deployment target, transaction digest, module name, deployed timestamp) to local storage upon successful deployment.
- **FR-002**: System MUST restore persisted deployment state on application load, validating that the stored state matches the current contract context before applying it.
- **FR-003**: System MUST discard stale deployment state when the current contract's module name or deployment target no longer matches the stored values.

#### Authorize Tab Navigation

- **FR-004**: System MUST display an "Authorize" navigation tab in the header, positioned after the existing "Visual" and "Move" tabs.
- **FR-005**: The Authorize tab MUST include an icon consistent with the existing navigation icon style (inline SVG, 18×14 viewport, matching stroke and fill conventions).
- **FR-006**: The Authorize tab MUST be disabled (not interactive, visually muted) when no contract has been successfully deployed.
- **FR-007**: The Authorize tab MUST become enabled when a valid deployment state exists (status "deployed" with a package ID).
- **FR-008**: The active view state ("visual", "move", or "authorize") MUST be persisted to local storage so it survives page reloads.

#### Turret List & Selection

- **FR-009**: System MUST query turrets owned by the connected wallet on the selected deployment server using the Sui GraphQL endpoint.
- **FR-010**: Each turret in the list MUST display its identifier and any currently authorized extension (name or type).
- **FR-011**: Each turret MUST have a styled checkbox following the same visual pattern as the existing tribe/ship selector component.
- **FR-012**: Turrets that already have the currently deployed extension authorized MUST be visually distinguished (pre-checked checkbox, disabled state, "already authorized" indicator).
- **FR-013**: System MUST show a loading state while turrets are being fetched and an error state with retry capability if the fetch fails.
- **FR-014**: System MUST show an empty state when no turrets are found for the connected wallet on the selected server.

#### Authorization Execution

- **FR-015**: System MUST construct a Sui transaction for each selected turret that: borrows the OwnerCap from the character, calls `authorize_extension` on the turret with the deployed contract's auth witness type, and returns the OwnerCap.
- **FR-016**: System MUST process turret authorizations sequentially (one transaction at a time), not in parallel, to avoid OwnerCap borrowing conflicts.
- **FR-017**: System MUST display a progress dialog during authorization showing each turret's status (pending, submitting, confirming, confirmed, failed).
- **FR-018**: System MUST only mark a turret as "confirmed" (green tick) once on-chain confirmation is received, not optimistically upon submission.
- **FR-019**: System MUST continue processing remaining turrets if one turret's authorization fails, rather than aborting the entire batch.
- **FR-020**: System MUST display a summary upon completion showing counts of successful and failed authorizations.

#### Error Handling

- **FR-021**: System MUST handle wallet disconnection during authorization by pausing the process and showing a reconnection prompt.
- **FR-022**: System MUST handle on-chain transaction errors (e.g. OwnerCap not found, turret offline) gracefully with user-readable error messages.
- **FR-023**: System MUST implement a confirmation timeout; if an authorization event is not received within a reasonable period, the turret should show a warning state rather than remaining in "confirming" indefinitely.

### Key Entities

- **Deployment State**: Represents a successfully deployed contract — includes package ID, module name, deployment target ID, transaction digest, and timestamp. Persisted in local storage and used as a gate for the Authorize tab.
- **Turret**: An on-chain Smart Assembly object owned by the connected wallet. Has an ID, an optional currently authorized extension reference, and belongs to a specific server/network. Fetched via GraphQL.
- **OwnerCap**: An on-chain capability object required to authorize extensions on a turret. Borrowed from the Character object during the authorization transaction and returned afterward.
- **Authorization Transaction**: A Sui Move transaction that borrows an OwnerCap, calls `authorize_extension` on a turret with a specific auth witness type, and returns the OwnerCap. One transaction per turret.
- **Auth Witness Type**: The fully qualified Move type identifying the extension being authorized (e.g. `<packageId>::<module>::TurretAuth`). Derived from the deployed contract's package ID and module name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can authorize an extension on a selected turret in under 30 seconds (excluding wallet signing time), from clicking "Authorize" to seeing the green tick confirmation.
- **SC-002**: Deployment state persists across page reloads with 100% fidelity — reloading after deployment always restores the correct state without requiring re-deployment.
- **SC-003**: 95% of users can complete the full authorize workflow (deploy → select turrets → authorize → see confirmation) on their first attempt without external guidance.
- **SC-004**: The turret list loads and displays within 3 seconds of opening the Authorize tab on a standard network connection.
- **SC-005**: Failed individual turret authorizations do not prevent remaining turrets from being processed — batch completion rate is independent of individual failures.
- **SC-006**: The Authorize tab is correctly disabled 100% of the time when no deployment exists, preventing premature access attempts.

## Assumptions

- The Sui GraphQL endpoint (`https://graphql.testnet.sui.io/graphql`) supports querying objects by owner address and type filter, which is the existing pattern used for character profile lookups.
- Turrets are queried as objects of type `<worldPackageId>::turret::Turret` owned by the connected wallet's address. The world package ID is available from the existing package reference bundles.
- The authorization transaction pattern follows the established EVE Frontier convention: borrow OwnerCap → authorize_extension → return OwnerCap, as documented in `world-contracts/ts-scripts/builder_extension/authorize-turret.ts`.
- Each turret authorization requires a separate transaction because the OwnerCap must be borrowed and returned per-turret to avoid conflicts.
- The existing DeploymentProgressModal component's visual pattern and UX serves as the model for the authorization progress dialog.
- Turret checkbox styling will be created from scratch following the project's sci-fi industrial aesthetic (Tailwind CSS 4, CSS variables, 0px border-radius). The `NumericOptionEditor` pattern in `NodeFieldEditor.tsx` provides a reference for the label + hidden-checkbox + custom-indicator approach.
- The confirmation timeout for event listening defaults to 30 seconds (`AUTHORIZATION_CONFIRMATION_TIMEOUT_MS`), consistent with typical Sui testnet finality times.
