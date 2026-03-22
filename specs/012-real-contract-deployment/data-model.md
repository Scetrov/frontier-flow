# Data Model: Verified Contract Deployment

## Entity: DeploymentTarget

**Purpose**: Represents a deployable Sui environment selectable by the user.

**Fields**:

- `id`: one of `local`, `testnet:stillness`, `testnet:utopia`
- `label`: user-facing environment label
- `requiresWalletSigning`: boolean
- `requiresPublishedReferences`: boolean
- `confirmationMode`: one of `local-publish`, `wallet-publish`

**Validation rules**:

- `id` must map one-to-one with `label`.
- Targets that require published references must resolve a valid `TargetReferenceBundle` before submission.
- `local` must never require published reference bundles.

## Entity: TargetReferenceBundle

**Purpose**: Captures maintained, target-specific package identifiers required to prepare remote deployments.

**Fields**:

- `targetId`: `testnet:stillness` or `testnet:utopia`
- `worldPackageId`: published world package identifier
- `objectRegistryId`: object registry identifier
- `serverAddressRegistryId`: server address registry identifier
- `source`: authoritative publication reference
- `lastVerifiedOn`: ISO date of last verification

**Validation rules**:

- Every identifier field must be a non-empty `0x`-prefixed hex string.
- `targetId` must be unique across bundles.
- Invalid or missing bundles block deployment before submission.

## Entity: CompiledArtifactSnapshot

**Purpose**: Represents the exact compiled output eligible for deployment.

**Fields**:

- `artifactId`: unique artifact identifier
- `graphRevision`: stable revision or fingerprint for the graph state
- `moduleName`: generated module name
- `bytecodeModules`: compiled modules to publish
- `manifestVariant`: target-aware package metadata used for deployment preparation

**Validation rules**:

- `bytecodeModules` must contain at least one compiled module.
- `graphRevision` must still match the active graph state when deployment begins.
- `artifactId` and `graphRevision` together uniquely identify what was submitted.

## Entity: DeploymentRequest

**Purpose**: The immutable request handed to the deployment executor.

**Fields**:

- `attemptId`: unique deployment attempt identifier
- `artifactId`: chosen artifact identifier
- `graphRevision`: artifact graph revision at start time
- `targetId`: selected deployment target
- `bytecodeModules`: publishable modules for this attempt
- `targetReferences`: resolved `TargetReferenceBundle` when required

**Validation rules**:

- `artifactId` must reference a valid `CompiledArtifactSnapshot`.
- `targetReferences` is required only for published targets.
- `bytecodeModules` must be copied from the selected artifact snapshot and not mutated during execution.

## Entity: DeploymentAttempt

**Purpose**: Represents one end-to-end deployment run and its current or terminal state.

**Fields**:

- `attemptId`: unique identifier
- `artifactId`: associated artifact identifier
- `graphRevision`: submitted graph revision
- `targetId`: selected target
- `startedAt`: start timestamp
- `endedAt`: terminal timestamp when available
- `outcome`: one of `blocked`, `cancelled`, `failed`, `unresolved`, `succeeded`
- `currentStage`: one of `validating`, `preparing`, `signing`, `submitting`, `confirming`
- `message`: current or terminal user-facing summary
- `errorCode`: optional classified failure code

**Validation rules**:

- `endedAt` is required for every terminal outcome.
- `outcome = succeeded` requires a linked `DeploymentEvidence` record.
- `outcome = unresolved` is only valid after submission has begun.

**State transitions**:

- `created -> validating`
- `validating -> blocked`
- `validating -> preparing`
- `preparing -> signing` for wallet-backed targets
- `preparing -> submitting` for local targets
- `signing -> cancelled`
- `signing -> submitting`
- `submitting -> confirming`
- `confirming -> succeeded`
- `confirming -> unresolved`
- `preparing|signing|submitting|confirming -> failed`

## Entity: DeploymentEvidence

**Purpose**: Captures the auditable evidence returned by the selected Sui target.

**Fields**:

- `attemptId`: owning deployment attempt
- `packageId`: published package identifier
- `confirmationReference`: confirming transaction digest
- `submittedAt`: timestamp when submission was accepted
- `confirmedAt`: timestamp when confirmation was obtained
- `targetId`: deployment target

**Validation rules**:

- `packageId` must be a non-empty `0x`-prefixed hex string.
- `confirmationReference` must be present for every successful deployment.
- `confirmedAt` must be equal to or later than `submittedAt`.

## Entity: DeploymentProgress

**Purpose**: Drives the progress surface for active attempts.

**Fields**:

- `attemptId`: owning attempt
- `stage`: current stage
- `stageIndex`: zero-based visible order
- `stageCount`: total visible stage count
- `completedStages`: ordered list of completed stages
- `activeMessage`: current user-facing status message
- `dismissedByUser`: boolean

**Validation rules**:

- `stageIndex` must remain within `0 <= stageIndex < stageCount`.
- `completedStages` must preserve canonical stage order.
- `dismissedByUser` changes visibility only and cannot alter execution outcome.

## Entity: DeploymentReviewEntry

**Purpose**: Represents a session-visible record used to compare recent attempts.

**Fields**:

- `attemptId`: unique attempt reference
- `artifactId`: deployed artifact identifier
- `targetId`: selected target
- `outcome`: terminal outcome
- `stage`: final stage reached
- `headline`: short summary
- `details`: remediation or success detail
- `packageId`: optional successful package identifier
- `confirmationReference`: optional transaction digest

**Validation rules**:

- Review entries must preserve attempt ordering by recency.
- Non-success entries must include actionable `details`.
- Success entries must include both `packageId` and `confirmationReference`.

## Relationships

- A `DeploymentRequest` is created from one `CompiledArtifactSnapshot` and one `DeploymentTarget`.
- A `DeploymentAttempt` owns at most one `DeploymentEvidence` record.
- A `DeploymentAttempt` produces one active `DeploymentProgress` while in flight.
- A `DeploymentAttempt` produces one `DeploymentReviewEntry` when it reaches a terminal outcome.
- A `TargetReferenceBundle` is required only when `DeploymentTarget.requiresPublishedReferences = true`.
