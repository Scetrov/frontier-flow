import { Transaction } from "@mysten/sui/transactions";
import { prepareArtifactManifestForTarget } from "../compiler/emitter";
import type { DeploymentTarget, GeneratedContractArtifact, PackageReferenceBundle } from "../compiler/types";

export interface RemotePublishRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly target: DeploymentTarget;
  readonly references: PackageReferenceBundle;
  readonly execute: (transaction: Transaction, signal?: AbortSignal) => Promise<{ digest: string }>;
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
  const manifest = prepareArtifactManifestForTarget(
    request.artifact.moduleName,
    request.target.id,
    request.artifact.dependencies,
  );
  const transaction = new Transaction();
  transaction.publish({
    modules: request.artifact.bytecodeModules.map((module) => Array.from(module)),
    dependencies: Array.from(manifest.dependencies),
  });

  const result = await request.execute(transaction, request.signal);
  return {
    transactionDigest: result.digest,
  };
}