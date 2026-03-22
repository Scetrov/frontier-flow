import type {
  DeploymentAttempt,
  DeploymentProgress,
  DeploymentReviewEntry,
  DeploymentStage,
  DeploymentStatus,
  DeploymentStatusMessage,
  DeploymentTargetId,
  PackageReferenceBundle,
} from "../../compiler/types";

/**
 * Create a deployment attempt fixture for deployment workflow tests.
 */
export function createDeploymentAttemptFixture(
  overrides: Partial<DeploymentAttempt> = {},
): DeploymentAttempt {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    targetId: overrides.targetId ?? "local",
    startedAt: overrides.startedAt ?? 1,
    endedAt: overrides.endedAt,
    outcome: overrides.outcome ?? "blocked",
    currentStage: overrides.currentStage ?? "validating",
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    message: overrides.message ?? "Deployment is waiting for required inputs.",
    errorCode: overrides.errorCode,
  };
}

/**
 * Create a deployment progress fixture for modal and stage-transition tests.
 */
export function createDeploymentProgressFixture(
  overrides: Partial<DeploymentProgress> = {},
): DeploymentProgress {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    targetId: overrides.targetId ?? "local",
    stage: overrides.stage ?? "validating",
    stageIndex: overrides.stageIndex ?? 0,
    stageCount: overrides.stageCount ?? 5,
    completedStages: overrides.completedStages ?? [],
    activeMessage: overrides.activeMessage ?? "Validating deployment prerequisites.",
    dismissedByUser: overrides.dismissedByUser ?? false,
  };
}

/**
 * Create a deployment status message fixture for footer and Move-source messaging tests.
 */
export function createDeploymentStatusMessageFixture(
  overrides: Partial<DeploymentStatusMessage> = {},
): DeploymentStatusMessage {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    targetId: overrides.targetId ?? "local",
    severity: overrides.severity ?? "warning",
    headline: overrides.headline ?? "Deployment blocked",
    details: overrides.details ?? "Resolve the required inputs before deploying.",
    stage: overrides.stage,
    packageId: overrides.packageId,
    visibleInFooter: overrides.visibleInFooter ?? true,
    visibleInMovePanel: overrides.visibleInMovePanel ?? true,
  };
}

/**
 * Create a deployment status snapshot fixture for artifact-centric tests.
 */
export function createDeploymentStatusFixture(
  overrides: Partial<DeploymentStatus> = {},
): DeploymentStatus {
  return {
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    status: overrides.status ?? "blocked",
    targetId: overrides.targetId ?? "local",
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    outcome: overrides.outcome,
    stage: overrides.stage,
    severity: overrides.severity,
    headline: overrides.headline ?? "Deployment blocked",
    targetMode: overrides.targetMode ?? "existing-turret",
    requiredInputs: overrides.requiredInputs ?? ["generated contract artifact"],
    resolvedInputs: overrides.resolvedInputs ?? [],
    blockedReasons: overrides.blockedReasons ?? ["Missing deployment prerequisites."],
    nextActionSummary: overrides.nextActionSummary ?? "Resolve the required inputs before deploying.",
    reviewHistory: overrides.reviewHistory ?? [],
  };
}

/**
 * Create a deployment review entry fixture for persistent session review tests.
 */
export function createDeploymentReviewEntryFixture(
  overrides: Partial<DeploymentReviewEntry> = {},
): DeploymentReviewEntry {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    headline: overrides.headline ?? "Deployment blocked",
    targetId: overrides.targetId ?? "local",
    outcome: overrides.outcome ?? "blocked",
    severity: overrides.severity ?? "warning",
    startedAt: overrides.startedAt ?? 1,
    endedAt: overrides.endedAt ?? 2,
    stage: overrides.stage,
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    details: overrides.details ?? "Resolve the required inputs before deploying.",
    blockedReasons: overrides.blockedReasons ?? ["Missing deployment prerequisites."],
    historicalOnly: overrides.historicalOnly,
    historicalReason: overrides.historicalReason,
  };
}

/**
 * Create a published package reference fixture for target-validation tests.
 */
export function createPackageReferenceBundleFixture(
  targetId: Exclude<DeploymentTargetId, "local"> = "testnet:stillness",
  overrides: Partial<PackageReferenceBundle> = {},
): PackageReferenceBundle {
  return {
    targetId,
    environmentLabel: overrides.environmentLabel ?? (targetId === "testnet:stillness" ? "Stillness" : "Utopia"),
    worldPackageId: overrides.worldPackageId ?? "0x1",
    objectRegistryId: overrides.objectRegistryId ?? "0x2",
    serverAddressRegistryId: overrides.serverAddressRegistryId ?? "0x3",
    source: overrides.source ?? "test",
    lastVerifiedOn: overrides.lastVerifiedOn ?? "2026-03-21",
  };
}

/**
 * Ordered deployment stages shared by tests.
 */
export const DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "preparing",
  "signing",
  "submitting",
  "confirming",
];