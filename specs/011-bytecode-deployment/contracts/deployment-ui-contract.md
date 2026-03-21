# Contract: Deployment UI and State Surface

## Purpose

Define the user-visible contract between the deployment orchestration layer and the Frontier Flow UI surfaces that present deployment controls, progress, blockers, and results.

## Header Control Contract

### Inputs

- `selectedTarget`: one of `local`, `testnet:stillness`, `testnet:utopia`
- `canDeploy`: boolean derived from artifact freshness and blocker checks
- `isDeploying`: boolean for disabling duplicate launches
- `isCompiling`: boolean for Build-state coordination

### Behaviors

- The header must render the existing Build action and a peer deployment control adjacent to it.
- The deployment control must show the currently selected target before confirmation.
- The control must prevent deployment launch when `canDeploy = false` or `isDeploying = true`.
- Keyboard users must be able to open the target menu, move between options, confirm a target, and trigger deployment without pointer input.

## Progress Modal Contract

### Inputs

- `open`: boolean
- `target`: selected deployment target
- `stage`: one of `validating`, `preparing`, `signing`, `submitting`, `confirming`
- `completedStages`: ordered list of completed stages
- `status`: one of `active`, `cancelled`, `failed`, `succeeded`
- `message`: user-facing progress or result message

### Behaviors

- Opening deployment sets `open = true` immediately after launch.
- The modal must show a progress bar and human-readable stage list.
- The modal must allow user dismissal without cancelling the underlying deployment attempt.
- Terminal states must render a final success, failure, or cancellation summary.

## Footer and Status Popup Contract

### Inputs

- `deploymentStatusLabel`: short status text
- `deploymentSummary`: expanded message text
- `target`: selected target for the latest attempt
- `stage`: last completed or failed stage
- `severity`: success, warning, or error
- `packageId`: resulting package identifier when available

### Behaviors

- The footer deployment indicator remains separate from compilation status.
- Expanding the deployment popup must show the latest deployment summary for the active session.
- Error states must identify the target and include user-actionable remediation.
- Success states must identify the target and resulting package identifier.

## Move Source Panel Contract

### Inputs

- `deploymentLabel`: current summarized deployment state
- `deploymentSummary`: current follow-up or result summary

### Behaviors

- The Move source panel may mirror the current deployment label and summary but must not become the primary progress surface.
- Deployment metadata shown here must match the footer/status popup summary for the latest attempt.
