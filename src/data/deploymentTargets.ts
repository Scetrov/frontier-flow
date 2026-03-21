import type { DeploymentTarget, DeploymentTargetId } from "../compiler/types";

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
  },
  {
    id: "testnet:stillness",
    label: "testnet:stillness",
    networkFamily: "testnet",
    requiresPublishedPackageRefs: true,
    supportsWalletSigning: true,
  },
  {
    id: "testnet:utopia",
    label: "testnet:utopia",
    networkFamily: "testnet",
    requiresPublishedPackageRefs: true,
    supportsWalletSigning: true,
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