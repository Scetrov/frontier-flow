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
    supportsWalletSigning: true,
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
 * Return true when a target uses the remote wallet-backed deployment flow.
 */
export function isRemoteDeploymentTarget(targetId: DeploymentTargetId): boolean {
  return getDeploymentTarget(targetId).networkFamily !== "local";
}