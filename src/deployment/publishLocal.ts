import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { prepareArtifactManifestForTarget } from "../compiler/emitter";
import type { DeploymentTarget, GeneratedContractArtifact, PackageReferenceBundle } from "../compiler/types";

export interface LocalPublishRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly target: DeploymentTarget;
  readonly references: PackageReferenceBundle | null;
  readonly signal?: AbortSignal;
}

export interface LocalPublishResult {
  readonly packageId?: string;
  readonly transactionDigest?: string;
}

/**
 * Publish a compiled artifact to a project-controlled local validator.
 */
export async function publishToLocalValidator(request: LocalPublishRequest): Promise<LocalPublishResult> {
  const client = new SuiJsonRpcClient({ url: request.target.rpcUrl, network: "localnet" });
  const signer = new Ed25519Keypair();
  const signerAddress = signer.getPublicKey().toSuiAddress();
  await requestSuiFromFaucetV2({
    host: getFaucetHost("localnet"),
    recipient: signerAddress,
  });

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
  transaction.transferObjects([upgradeCap], signerAddress);

  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
    signal: request.signal,
  });
  const packageId = result.objectChanges?.find((change) => change.type === "published")?.packageId;

  return {
    packageId,
    transactionDigest: result.digest,
  };
}