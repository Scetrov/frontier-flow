import type { DeploymentStage, DeploymentTarget, DeploymentTargetId } from "../compiler/types";

export const LOCAL_DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "preparing",
  "signing",
  "submitting",
  "confirming",
];

export const DEPLOY_GRADE_LOCAL_DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "fetch-world-source",
  "resolve-dependencies",
  "deploy-grade-compile",
  "submitting",
  "confirming",
];

export const DEPLOY_GRADE_REMOTE_DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "fetch-world-source",
  "resolve-dependencies",
  "deploy-grade-compile",
  "signing",
  "submitting",
  "confirming",
];

/**
 * Default deployment target shown before the user makes an explicit selection.
 */
export const DEFAULT_DEPLOYMENT_TARGET: DeploymentTargetId = "local";

/**
 * Supported deployment targets for bytecode deployment.
 */
export const DEPLOYMENT_TARGETS: readonly DeploymentTarget[] = [
  {
    id: "local",
    label: "local",
    networkFamily: "local",
    requiresPublishedPackageRefs: false,
    supportsWalletSigning: false,
    rpcUrl: "http://127.0.0.1:9000",
    requiresLocalValidator: true,
  },
  {
    id: "local:evefrontier",
    label: "local:evefrontier",
    networkFamily: "local",
    requiresPublishedPackageRefs: true,
    supportsWalletSigning: false,
    rpcUrl: "http://127.0.0.1:9000",
    requiresLocalValidator: true,
  },
  {
    id: "testnet:stillness",
    label: "testnet:stillness",
    networkFamily: "testnet",
    requiresPublishedPackageRefs: true,
    supportsWalletSigning: true,
    rpcUrl: "https://fullnode.testnet.sui.io:443",
    requiresLocalValidator: false,
  },
  {
    id: "testnet:utopia",
    label: "testnet:utopia",
    networkFamily: "testnet",
    requiresPublishedPackageRefs: true,
    supportsWalletSigning: true,
    rpcUrl: "https://fullnode.testnet.sui.io:443",
    requiresLocalValidator: false,
  },
];

/**
 * Resolve a deployment target definition by id.
 */
export function getDeploymentTarget(targetId: DeploymentTargetId): DeploymentTarget {
  const target = DEPLOYMENT_TARGETS.find((candidate) => candidate.id === targetId);

  if (target === undefined) {
    throw new Error(`Unknown deployment target: ${targetId}`);
  }

  return target;
}

/**
 * Return true when a target must compile against published package references.
 */
export function usesDeployGradeCompilation(
  target: Pick<DeploymentTarget, "requiresPublishedPackageRefs">,
): boolean {
  return target.requiresPublishedPackageRefs;
}

/**
 * Return true when a target publishes through a connected wallet.
 */
export function usesWalletSignedPublish(
  target: Pick<DeploymentTarget, "supportsWalletSigning">,
): boolean {
  return target.supportsWalletSigning;
}

/**
 * Resolve the visible deployment stage sequence for a target.
 */
export function getDeploymentStageSequence(targetId: DeploymentTargetId): readonly DeploymentStage[] {
  const target = getDeploymentTarget(targetId);

  if (!usesDeployGradeCompilation(target)) {
    return LOCAL_DEPLOYMENT_STAGE_SEQUENCE;
  }

  return usesWalletSignedPublish(target)
    ? DEPLOY_GRADE_REMOTE_DEPLOYMENT_STAGE_SEQUENCE
    : DEPLOY_GRADE_LOCAL_DEPLOYMENT_STAGE_SEQUENCE;
}

/**
 * Return true when a target uses the remote wallet-backed deployment flow.
 */
export function isRemoteDeploymentTarget(targetId: DeploymentTargetId): boolean {
  return getDeploymentTarget(targetId).networkFamily !== "local";
}