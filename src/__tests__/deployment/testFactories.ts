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

const DEFAULT_DEPLOYMENT_ATTEMPT_ID = "attempt-0001";
const DEFAULT_ARTIFACT_ID = "starter_contract-00000000";
const DEFAULT_TARGET_ID: DeploymentTargetId = "local";
const DEFAULT_BLOCKED_REASON = "The local validator required for local deployment is unavailable.";
const DEFAULT_NEXT_ACTION = "Start or configure the local validator, then retry deployment to local.";
const DEFAULT_REQUIRED_INPUTS = ["current compiled bytecode artifact", "available local validator"] as const;

/**
 * Create a deployment attempt fixture for deployment workflow tests.
 */
export function createDeploymentAttemptFixture(
  overrides: Partial<DeploymentAttempt> = {},
): DeploymentAttempt {
  return {
    attemptId: overrides.attemptId ?? DEFAULT_DEPLOYMENT_ATTEMPT_ID,
    artifactId: overrides.artifactId ?? DEFAULT_ARTIFACT_ID,
    targetId: overrides.targetId ?? DEFAULT_TARGET_ID,
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
  const targetId = overrides.targetId ?? DEFAULT_TARGET_ID;
  const stageSequence = getDeploymentStageSequence(targetId);
  const stageIndex = overrides.stageIndex ?? 0;
  const stageCount = overrides.stageCount ?? stageSequence.length;

  return {
    attemptId: overrides.attemptId ?? DEFAULT_DEPLOYMENT_ATTEMPT_ID,
    targetId,
    stage: overrides.stage ?? "validating",
    stageIndex,
    stageCount,
    completedStages: overrides.completedStages ?? stageSequence.slice(0, stageIndex),
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
    attemptId: overrides.attemptId ?? DEFAULT_DEPLOYMENT_ATTEMPT_ID,
    targetId: overrides.targetId ?? DEFAULT_TARGET_ID,
    severity: overrides.severity ?? "warning",
    headline: overrides.headline ?? "Deployment blocked",
    details: overrides.details ?? DEFAULT_NEXT_ACTION,
    stage: overrides.stage,
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
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
    artifactId: overrides.artifactId ?? DEFAULT_ARTIFACT_ID,
    status: overrides.status ?? "blocked",
    targetId: overrides.targetId ?? DEFAULT_TARGET_ID,
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    outcome: overrides.outcome,
    stage: overrides.stage,
    severity: overrides.severity,
    headline: overrides.headline ?? "Deployment blocked",
    targetMode: overrides.targetMode ?? "existing-turret",
    requiredInputs: overrides.requiredInputs ?? DEFAULT_REQUIRED_INPUTS,
    resolvedInputs: overrides.resolvedInputs ?? [],
    blockedReasons: overrides.blockedReasons ?? [DEFAULT_BLOCKED_REASON],
    nextActionSummary: overrides.nextActionSummary ?? DEFAULT_NEXT_ACTION,
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
    attemptId: overrides.attemptId ?? DEFAULT_DEPLOYMENT_ATTEMPT_ID,
    artifactId: overrides.artifactId ?? DEFAULT_ARTIFACT_ID,
    headline: overrides.headline ?? "Deployment blocked",
    targetId: overrides.targetId ?? DEFAULT_TARGET_ID,
    outcome: overrides.outcome ?? "blocked",
    severity: overrides.severity ?? "warning",
    startedAt: overrides.startedAt ?? 1,
    endedAt: overrides.endedAt ?? 2,
    stage: overrides.stage,
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    details: overrides.details ?? DEFAULT_NEXT_ACTION,
    blockedReasons: overrides.blockedReasons ?? [DEFAULT_BLOCKED_REASON],
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
    originalWorldPackageId: overrides.originalWorldPackageId ?? overrides.worldPackageId ?? "0x1",
    objectRegistryId: overrides.objectRegistryId ?? "0x2",
    serverAddressRegistryId: overrides.serverAddressRegistryId ?? "0x3",
    sourceVersionTag: overrides.sourceVersionTag ?? (targetId === "testnet:stillness" ? "v0.0.18" : "v0.0.21"),
    toolchainVersion: overrides.toolchainVersion ?? (targetId === "testnet:stillness" ? "1.67.1" : "1.68.0"),
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

export const REMOTE_DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "fetch-world-source",
  "resolve-dependencies",
  "deploy-grade-compile",
  "signing",
  "submitting",
  "confirming",
];

export function getDeploymentStageSequence(targetId: DeploymentTargetId): readonly DeploymentStage[] {
  return targetId === "local" ? DEPLOYMENT_STAGE_SEQUENCE : REMOTE_DEPLOYMENT_STAGE_SEQUENCE;
}