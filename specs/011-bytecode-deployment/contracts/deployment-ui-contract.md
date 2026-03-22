# Contract: Deployment UI and State Surface

## 1. Purpose

Define the user-visible contract between the deployment orchestration layer and the Frontier Flow UI surfaces that present deployment controls, progress, blockers, and results.

## 2. Header Control Contract

### 2.1. Inputs

- `selectedTarget`: one of `local`, `testnet:stillness`, `testnet:utopia`
- `canDeploy`: boolean derived from artifact freshness and blocker checks
- `isDeploying`: boolean for disabling duplicate launches
- `isCompiling`: boolean for Build-state coordination

### 2.2. Behaviors

- The header must render the existing Build action and a peer deployment control adjacent to it.
- The deployment control must show the currently selected target before confirmation.
- The control must prevent deployment launch when `canDeploy = false` or `isDeploying = true`.
- Keyboard users must be able to open the target menu, move between options, confirm a target, and trigger deployment without pointer input.

## 3. Progress Modal Contract

### 3.1. Inputs

- `open`: boolean
- `target`: selected deployment target
- `stage`: one of `validating`, `preparing`, `signing`, `submitting`, `confirming`
- `completedStages`: ordered list of completed stages
- `status`: one of `active`, `cancelled`, `failed`, `succeeded`
- `message`: user-facing progress or result message

### 3.2. Behaviors

- Opening deployment sets `open = true` immediately after launch.
- The modal must show a progress bar and human-readable stage list.
- The modal must allow user dismissal without cancelling the underlying deployment attempt.
- Terminal states must render a final success, failure, or cancellation summary.

## 4. Footer and Status Popup Contract

### 4.1. Inputs

- `deploymentStatusLabel`: short status text
- `deploymentSummary`: expanded message text
- `target`: selected target for the latest attempt
- `stage`: last completed or failed stage
- `severity`: success, warning, or error
- `packageId`: resulting package identifier when available

### 4.2. Behaviors

- The footer deployment indicator remains separate from compilation status.
- Expanding the deployment popup must show the latest deployment summary for the active session.
- Error states must identify the target and include user-actionable remediation.
- Success states must identify the target and resulting package identifier.

## 5. Move Source Panel Contract

### 5.1. Inputs

- `deploymentLabel`: current summarized deployment state
- `deploymentSummary`: current follow-up or result summary

### 5.2. Behaviors

- The Move source panel may mirror the current deployment label and summary but must not become the primary progress surface.
- Deployment metadata shown here must match the footer/status popup summary for the latest attempt.
