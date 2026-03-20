# Contract: Authorization Readiness

## Purpose

Defines the handoff between a compile-ready generated contract artifact and the workflow that attaches that artifact to an existing turret through extension registration or authorization.

## Scope

- Includes readiness for existing-turret attachment.
- Excludes full turret lifecycle automation such as anchor, online, offline, or unanchor operations.

## Required Fields

| Field               | Required | Meaning                                                 |
| ------------------- | -------- | ------------------------------------------------------- |
| `artifactId`        | yes      | Linked generated artifact                               |
| `status`            | yes      | `ready`, `blocked`, or `unknown-external`               |
| `targetTurretMode`  | yes      | Confirms readiness is for an existing turret            |
| `requiredInputs`    | yes      | Inputs needed to continue authorization or registration |
| `resolvedInputs`    | yes      | Inputs already satisfied by generation output           |
| `blockedReasons`    | yes      | Reasons attachment cannot proceed                       |
| `nextActionSummary` | yes      | User-facing statement of the next readiness action      |

## Invariants

- `ready` means the generated artifact is suitable for the existing authorization workflow, not that world lifecycle operations are available.
- `blocked` and `unknown-external` states must remain user-visible and traceable to specific missing prerequisites.
- Authorization readiness must not depend on a different artifact than the one previewed and compiled for the active DAG.

## Failure Contract

- If extension discovery, package addressing, or registration details are unresolved, readiness must remain blocked or unknown-external.
- The workflow must not imply that anchor or online lifecycle automation is part of this feature.
