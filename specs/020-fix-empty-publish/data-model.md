# 1. Data Model: Prevent Empty Publish Deployment

**Feature**: 020-fix-empty-publish  
**Date**: 2026-04-02

## 1.1. Entities

### 1.1.1. GeneratedContractArtifact (existing source entity)

Represents the authoring-time compile artifact already produced by the code generation pipeline.

| Field              | Type                    | Description                              |
| ------------------ | ----------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `artifactId`       | `string                 | undefined`                               | Stable identifier for review history and persistence |
| `moduleName`       | `string`                | Generated Sui Move module name           |
| `bytecodeModules`  | `readonly Uint8Array[]` | Authoring-time compiled package bytecode |
| `dependencies`     | `readonly string[]`     | Dependency package ids/manifests         |
| `compileReadiness` | `CompileReadiness       | undefined`                               | Existing compile readiness state                     |
| `deploymentStatus` | `DeploymentStatus       | undefined`                               | Existing deployment status snapshot                  |

**Role in this feature**: Supplies the default publish payload source for local deployment and fallback remote flows.

### 1.1.2. DeployGradeCompileResult (existing source entity)

Represents deploy-grade compilation output used for live-target publishing.

| Field                     | Type                    | Description                               |
| ------------------------- | ----------------------- | ----------------------------------------- |
| `modules`                 | `readonly Uint8Array[]` | Final deploy-grade bytecode modules       |
| `dependencies`            | `readonly string[]`     | Final dependency package ids              |
| `targetId`                | `DeploymentTargetId`    | Target for which the package was compiled |
| `sourceVersionTag`        | `string`                | Upstream world-contract source tag        |
| `builderToolchainVersion` | `string`                | Builder version used during compile       |
| `compiledAt`              | `number`                | Timestamp                                 |

**Role in this feature**: Supplies the publish payload source for remote targets and deploy-grade local flows.

### 1.1.3. PublishPayload (new transient design entity)

Represents the final package body that will be passed into Sui `Transaction.publish()` after all compilation or rebuild steps are complete.

| Field          | Type                    | Description                              |
| -------------- | ----------------------- | ---------------------------------------- | ---------------- | --------------------------- |
| `modules`      | `readonly Uint8Array[]` | Final module list that will be published |
| `dependencies` | `readonly string[]`     | Final normalized dependency ids          |
| `source`       | `"artifact"             | "deploy-grade"                           | "local-rebuild"` | Where the modules came from |
| `targetId`     | `DeploymentTargetId`    | Target receiving the publish transaction |

**Validation rules**:

- `modules.length > 0` is mandatory.
- Every module is expected to be a non-empty `Uint8Array`.
- Dependencies may vary by target, but dependencies never make an empty module list valid.

### 1.1.4. PublishPayloadReadinessResult (new transient design entity)

Captures the final readiness decision immediately before publisher invocation.

| Field         | Type              | Description                      |
| ------------- | ----------------- | -------------------------------- | ----------------------------------------------- |
| `ready`       | `boolean`         | Whether publish may continue     |
| `stage`       | `DeploymentStage` | Stage where the decision is made |
| `message`     | `string`          | User-safe explanation            |
| `remediation` | `string`          | Next action for recovery         |
| `errorCode`   | `string           | undefined`                       | Stable classification code for blocked attempts |

**Role in this feature**: Bridges low-level payload inspection and the existing deployment-attempt/status surfaces.

### 1.1.5. DeploymentAttempt (existing outcome entity)

Represents one user-initiated deploy action.

| Field          | Type              | Description                |
| -------------- | ----------------- | -------------------------- | ------------------------------------ | ------------ | ------------ | ---------------------- |
| `attemptId`    | `string`          | Unique attempt identifier  |
| `outcome`      | `"blocked"        | "cancelled"                | "failed"                             | "unresolved" | "succeeded"` | Attempt classification |
| `currentStage` | `DeploymentStage` | Latest stage reached       |
| `message`      | `string`          | User-facing outcome detail |
| `errorCode`    | `string           | undefined`                 | Stable machine-readable failure code |
| `packageId`    | `string           | undefined`                 | Package id on success                |

**Role in this feature**: Records empty-publish prevention as a `blocked` outcome with a dedicated error code and explanatory message.

### 1.1.6. DeploymentStatus and DeploymentReviewEntry (existing surfaced entities)

Represent the active deployment summary and recent review history shown in the footer and related status views.

| Entity                  | Key fields used by this feature                                                       |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `DeploymentStatus`      | `status`, `stage`, `headline`, `blockedReasons`, `nextActionSummary`, `reviewHistory` |
| `DeploymentReviewEntry` | `outcome`, `stage`, `details`, `blockedReasons`, `historicalOnly`                     |

**Role in this feature**: Preserve the blocked attempt, remediation text, and retry context without introducing a parallel UI model.

## 1.2. Relationships

```text
GeneratedContractArtifact ──┐
                           ├──> PublishPayload ───> PublishPayloadReadinessResult
DeployGradeCompileResult ──┘                              │
                                                          ▼
                                                DeploymentAttempt
                                                          │
                                                          ▼
                                DeploymentStatus + DeploymentReviewEntry
```

## 1.3. State Transitions

### 1.3.1. Publish Attempt Lifecycle

```text
validating
  → preparing / fetch-world-source / resolve-dependencies / deploy-grade-compile
  → publish-payload-check
      → blocked
      → signing → submitting → confirming → succeeded
```

### 1.3.2. Retry Path

```text
blocked (publish payload empty)
  → user rebuilds or refreshes artifact/package state
  → start new attempt
  → publish-payload-check runs again on the new final module set
```

## 1.4. Storage Summary

| Entity                                       | Storage                                     | Scope                    |
| -------------------------------------------- | ------------------------------------------- | ------------------------ |
| `GeneratedContractArtifact`                  | Existing compilation state + artifact model | Session/current artifact |
| `DeployGradeCompileResult`                   | In-memory deploy pipeline                   | Attempt/session          |
| `PublishPayload`                             | Transient in executor/publisher flow        | Attempt-local            |
| `PublishPayloadReadinessResult`              | Transient in executor flow                  | Attempt-local            |
| `DeploymentAttempt`                          | React deployment state                      | Session                  |
| `DeploymentStatus` / `DeploymentReviewEntry` | React state + artifact status surface       | Session/current artifact |

## 1.5. Notes

- No new durable storage is required for this feature.
- The feature may introduce a new `errorCode` and, if needed, a new blocker classification, but it should reuse the existing deployment status and history models.
