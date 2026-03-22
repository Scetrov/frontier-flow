import { Transaction } from "@mysten/sui/transactions";
import { prepareArtifactManifestForTarget } from "../compiler/emitter";
import type { DeploymentTarget, GeneratedContractArtifact, PackageReferenceBundle } from "../compiler/types";

export interface RemotePublishRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly ownerAddress: string;
  readonly onSubmitting?: () => void;
  readonly target: DeploymentTarget;
  readonly references: PackageReferenceBundle;
  readonly execute: (transaction: Transaction, request?: RemotePublishExecutionRequest) => Promise<{ digest: string }>;
  readonly signal?: AbortSignal;
}

export interface RemotePublishExecutionRequest {
  readonly onSubmitting?: () => void;
  readonly signal?: AbortSignal;
}

export interface RemotePublishResult {
  readonly packageId?: string;
  readonly transactionDigest?: string;
}

/**
 * Publish a compiled artifact to a supported remote Sui target.
 */
export async function publishToRemoteTarget(request: RemotePublishRequest): Promise<RemotePublishResult> {
  if (request.ownerAddress.length === 0) {
    throw new Error(`A connected wallet address is required before deploying to ${request.target.label}.`);
  }

  const manifest = prepareArtifactManifestForTarget(
    request.artifact.moduleName,
    request.target.id,
    request.artifact.dependencies,
  );
  const transaction = new Transaction();
  const [upgradeCap] = transaction.publish({
    modules: request.artifact.bytecodeModules.map((module) => Array.from(module)),
    dependencies: Array.from(manifest.dependencies),
  });
  transaction.transferObjects([upgradeCap], request.ownerAddress);

  const result = await request.execute(transaction, {
    onSubmitting: request.onSubmitting,
    signal: request.signal,
  });
  return {
    transactionDigest: result.digest,
  };
}