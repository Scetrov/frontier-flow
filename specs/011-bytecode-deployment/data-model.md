# Data Model: Bytecode Deployment Targets

## Entity: DeploymentTarget

**Purpose**: Represents the user-selected environment for a deployment attempt.

**Fields**:
- `id`: one of `local`, `testnet:stillness`, `testnet:utopia`
- `label`: user-facing label shown in the header control
- `networkFamily`: logical Sui network family used for wallet and endpoint validation
- `requiresPublishedPackageRefs`: boolean indicating whether Stillness/Utopia package references are mandatory
- `supportsWalletSigning`: boolean indicating whether a wallet-backed signature is required in this environment

**Validation rules**:
- `id` must be one of the three supported spec values.
- `label` must map one-to-one with `id`.
- Targets that require published package references must have a corresponding `PackageReferenceBundle`.

## Entity: PackageReferenceBundle

**Purpose**: Captures maintained EVE Frontier package identifiers and related metadata used to validate or prepare deployment.

**Fields**:
- `targetId`: `testnet:stillness` or `testnet:utopia`
- `worldPackageId`: canonical world package identifier for the target
- `objectRegistryId`: object registry identifier when needed by deployment readiness checks
- `serverAddressRegistryId`: registry identifier for target environment lookups when needed by follow-on flows
- `source`: provenance string for the maintained data snapshot
- `lastVerifiedOn`: date the bundle was last verified against the published resources page

**Validation rules**:
- `targetId` must not be `local`.
- All package identifier fields must be non-empty `0x`-prefixed hex strings.
- `source` must identify the authoritative publication used for verification.

## Entity: CompiledArtifactSnapshot

**Purpose**: Identifies the deployable build output associated with the current graph revision.

**Fields**:
- `artifactId`: unique artifact identifier
- `graphRevision`: stable revision or fingerprint of the current graph state
- `moduleName`: generated module name
- `bytecodeModules`: compiled bytecode modules ready for deployment
- `deploymentStatus`: latest persisted deployment status summary associated with this artifact

**Validation rules**:
- `bytecodeModules` must contain at least one compiled module before deployment can start.
- `graphRevision` must match the active graph revision for the artifact to be considered fresh.

## Entity: DeploymentAttempt

**Purpose**: Represents one end-to-end deployment run for a compiled artifact and selected target.

**Fields**:
- `attemptId`: unique identifier for the deployment run
- `artifactId`: associated compiled artifact identifier
- `targetId`: selected deployment target
- `startedAt`: timestamp when deployment began
- `endedAt`: timestamp when deployment reached a terminal state, if any
- `outcome`: one of `blocked`, `cancelled`, `failed`, `succeeded`
- `currentStage`: current or terminal deployment stage
- `packageId`: resulting deployed package identifier when successful
- `message`: latest user-facing summary for status surfaces
- `errorCode`: optional classified failure code for blocker/failure handling

**Validation rules**:
- `targetId` must reference a valid `DeploymentTarget`.
- `packageId` is required when `outcome = succeeded`.
- `endedAt` is required for all terminal outcomes.

**State transitions**:
- `created -> validating`
- `validating -> blocked`
- `validating -> preparing`
- `preparing -> signing`
- `signing -> cancelled`
- `signing -> submitting`
- `submitting -> confirming`
- `confirming -> succeeded`
- `preparing|signing|submitting|confirming -> failed`

## Entity: DeploymentProgress

**Purpose**: Drives the progress modal and maps internal deployment phases to user-visible progress.

**Fields**:
- `attemptId`: owning deployment attempt
- `stage`: one of `validating`, `preparing`, `signing`, `submitting`, `confirming`
- `stageIndex`: zero-based order position for progress bar rendering
- `stageCount`: total number of visible stages
- `completedStages`: ordered list of completed stages
- `activeMessage`: current user-facing progress message
- `dismissedByUser`: boolean indicating whether the modal has been dismissed while the workflow continues

**Validation rules**:
- `stageIndex` must be within `0 <= stageIndex < stageCount`.
- `completedStages` must preserve the defined stage order.
- `dismissedByUser` cannot terminate the underlying attempt by itself.

## Entity: DeploymentStatusMessage

**Purpose**: Represents the message shown in the footer/status popup and related status surfaces.

**Fields**:
- `attemptId`: source deployment attempt
- `targetId`: selected deployment target
- `severity`: one of `info`, `warning`, `error`, `success`
- `headline`: short label for the surface
- `details`: user-actionable explanation
- `stage`: related deployment stage if applicable
- `visibleInFooter`: boolean
- `visibleInMovePanel`: boolean

**Validation rules**:
- Error messages must include `details` with a remediation hint.
- Success messages must include the target and resulting package identifier.

## Relationships

- A `DeploymentAttempt` targets exactly one `DeploymentTarget`.
- A `DeploymentAttempt` consumes exactly one fresh `CompiledArtifactSnapshot`.
- A `PackageReferenceBundle` may be required by a `DeploymentAttempt` depending on target.
- A `DeploymentAttempt` produces one active `DeploymentProgress` and one latest `DeploymentStatusMessage` while in session.
- A `CompiledArtifactSnapshot` retains the latest summarized deployment result for status surfaces after the modal closes.
