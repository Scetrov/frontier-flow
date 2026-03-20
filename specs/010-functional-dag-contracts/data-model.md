# Phase 1 Data Model: Functional DAG Contracts

## 1. SupportedDagProfile

Represents the rules that define whether a DAG pattern is intentionally supported by the product.

| Field                     | Type   | Description                                                        |
| ------------------------- | ------ | ------------------------------------------------------------------ |
| `id`                      | string | Stable identifier for the support profile                          |
| `name`                    | string | Human-readable profile name                                        |
| `status`                  | enum   | `supported` or `unsupported`                                       |
| `entryTriggers`           | list   | Allowed event-trigger families for the DAG                         |
| `requiredNodeFamilies`    | list   | Node families that must be present for this profile                |
| `disallowedPatterns`      | list   | Known graph patterns that invalidate support                       |
| `expectedBehaviorSummary` | string | Plain-language summary of the intended contract behavior           |
| `deploymentMode`          | enum   | Deployment-status expectation for existing-turret attachment       |

**Validation rules**:

- `status` must be explicit for every profile.
- A `supported` profile must define at least one entry trigger and one expected behavior summary.
- `disallowedPatterns` cannot conflict with `requiredNodeFamilies`.

## 2. ReferenceDagCase

Represents a concrete DAG fixture used for deterministic validation and regression detection.

| Field                              | Type        | Description                                                       |
| ---------------------------------- | ----------- | ----------------------------------------------------------------- |
| `id`                               | string      | Stable fixture identifier                                         |
| `profileId`                        | string      | Linked `SupportedDagProfile`                                      |
| `fixtureSource`                    | string      | Fixture location or canonical graph seed                          |
| `supportStatus`                    | enum        | `supported` or `unsupported`                                      |
| `expectedArtifactId`               | string/null | Expected artifact identifier when supported                       |
| `expectedDiagnostics`              | list        | Expected diagnostics when unsupported or partially blocked        |
| `expectedSemanticOutcomes`         | list        | Functional assertions for scoring, filtering, and output behavior |
| `expectedDeterministicFingerprint` | string      | Canonical reference used to detect artifact drift                 |

**Relationships**:

- Many `ReferenceDagCase` records map to one `SupportedDagProfile`.
- One `ReferenceDagCase` may yield zero or one `FunctionalContractArtifact`.

**Validation rules**:

- Supported cases must define `expectedArtifactId` and at least one semantic outcome.
- Unsupported cases must define at least one blocking diagnostic.

## 3. FunctionalContractArtifact

Represents the compile-ready package generated from a supported DAG.

**Fields**:

- `artifactId` (`string`): Stable generated artifact identifier
- `dagCaseId` (`string`): Source `ReferenceDagCase` or active graph identifier
- `contractIdentity` (`object`): Deterministic package and module identity data
- `sourceFiles` (`list`): Generated Move source content grouped by file
- `manifest` (`object`): Compile-ready package metadata and dependency references
- `traceSections` (`list`): Stable links from generated sections to graph elements
- `compileReadiness` (`enum`): `ready` or `blocked`
- `deploymentStatusId` (`string`): Linked deployment-status record for turret attachment

**Validation rules**:

- Supported DAGs must produce exactly one artifact per generation run.
- `contractIdentity`, `sourceFiles`, and `manifest` are mandatory when `compileReadiness` is `ready`.
- Artifact ordering and section ordering must be stable for identical inputs.

## 4. GenerationDiagnostic

Represents a user-visible warning or blocking issue from validation, generation, dependency readiness, compilation, or deployment preparation.

| Field             | Type    | Description                                                         |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `id`              | string  | Stable diagnostic identifier                                        |
| `severity`        | enum    | `warning` or `error`                                                |
| `category`        | enum    | `structural`, `semantic`, `dependency`, `compiler`, `deployment`    |
| `message`         | string  | Human-readable explanation                                          |
| `blocking`        | boolean | Whether the workflow must stop                                      |
| `graphRefs`       | list    | Related node, socket, edge, or path references                      |
| `artifactRefs`    | list    | Related contract sections, files, or identities                     |
| `remediationHint` | string  | Suggested next action                                               |

**Validation rules**:

- Every blocking diagnostic must identify either graph context, artifact context, or both.
- Compiler diagnostics without graph mappings must still remain user-visible with artifact context.

## 5. ContractSectionTrace

Represents the persistent mapping between generated contract sections and source graph semantics.

| Field              | Type   | Description                                                                         |
| ------------------ | ------ | ----------------------------------------------------------------------------------- |
| `traceId`          | string | Stable section-trace identifier                                                     |
| `artifactId`       | string | Parent artifact                                                                     |
| `semanticRole`     | string | Section purpose such as trigger handling, filtering, scoring, or deployment glue    |
| `graphNodeIds`     | list   | Contributing node identifiers                                                       |
| `graphEdgeIds`     | list   | Contributing edge identifiers                                                       |
| `generatedSymbols` | list   | Stable symbols or section labels emitted for that trace                             |

**Validation rules**:

- Every major generated contract section must have one trace entry.
- Trace ordering must follow artifact ordering for deterministic review and diagnostics.

## 6. DeploymentStatus

Represents whether a generated artifact can be attached to an existing turret through extension registration and deployment flows.

| Field               | Type   | Description                                                  |
| ------------------- | ------ | ------------------------------------------------------------ |
| `id`                | string | Stable readiness identifier                                  |
| `artifactId`        | string | Parent generated artifact                                    |
| `status`            | enum   | `ready`, `blocked`, or `deployed`                            |
| `requiredInputs`    | list   | Information or actions required from the user or environment |
| `resolvedInputs`    | list   | Inputs already satisfied by generation output                |
| `blockedReasons`    | list   | Reasons readiness cannot proceed                             |
| `targetTurretScope` | string | Confirms this applies only to existing turrets               |

**Validation rules**:

- `ready` state requires no remaining blocking reasons.
- Any unresolved external platform detail must surface as `blocked`, never silently pass.

## State Transitions

### Graph-to-Artifact Lifecycle

`draft graph` -> `validated graph` -> `supported or unsupported classification` -> `artifact generated` -> `compile ready or compile blocked` -> `deployment ready, deployment blocked, or deployed`

### Diagnostic Lifecycle

`detected` -> `surfaced to user` -> `resolved by graph or environment change` or `retained as current blocker`

### Reference Case Lifecycle

`defined` -> `expected outcome approved` -> `regression checked in Vitest` -> `revalidated on generator or node changes`
