# Contract: Deployment Status

## Purpose

Defines the handoff between a compile-ready generated contract artifact and the workflow that attaches that artifact to an existing turret through extension registration and deployment preparation.

## Scope

- Includes deployment status for existing-turret attachment.
- Excludes full turret lifecycle automation such as anchor, online, offline, or unanchor operations.

## Required Fields

| Field               | Required | Meaning                                                 |
| ------------------- | -------- | ------------------------------------------------------- |
| `artifactId`        | yes      | Linked generated artifact                               |
| `status`            | yes      | `ready`, `blocked`, or `deployed`                       |
| `targetTurretMode`  | yes      | Confirms status is for an existing turret               |
| `requiredInputs`    | yes      | Inputs needed to continue deployment or registration    |
| `resolvedInputs`    | yes      | Inputs already satisfied by generation output           |
| `blockedReasons`    | yes      | Reasons attachment cannot proceed                       |
| `nextActionSummary` | yes      | User-facing statement of the next deployment action     |

## Invariants

- `ready` means the generated artifact is suitable for the existing deployment workflow, not that world lifecycle operations are available.
- `blocked` and `deployed` states must remain user-visible and traceable to specific workflow milestones.
- Deployment status must not depend on a different artifact than the one previewed and compiled for the active DAG.

## Failure Contract

- If extension discovery, package addressing, or registration details are unresolved, deployment status must remain blocked.
- The workflow must not imply that anchor or online lifecycle automation is part of this feature.
