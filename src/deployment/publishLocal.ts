import { requestSuiFromFaucetV2, getFaucetHost } from "@mysten/sui/faucet";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { loadMoveBuilderLite, moveBuilderLiteWasmUrl, verifyMoveBuilderLiteIntegrity } from "../compiler/moveBuilderLite";
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

interface LocalPublishCompilerModule {
  initMoveCompiler(options?: { readonly wasm?: string | URL }): Promise<void>;
  buildMovePackage(input: {
    readonly files: Readonly<Record<string, string>>;
    readonly silenceWarnings: boolean;
    readonly network: string;
  }): Promise<{ readonly modules: readonly string[] } | { readonly error: string }>;
}

interface LocalPublishDependencies {
  readonly loadCompilerModule?: () => Promise<LocalPublishCompilerModule>;
  readonly verifyCompilerIntegrity?: () => Promise<void>;
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(globalThis.atob(value), (character) => character.charCodeAt(0));
}

function artifactBundlesWorldShim(artifact: GeneratedContractArtifact): boolean {
  return (artifact.sourceFiles ?? []).some((file) => file.path.startsWith("deps/world/"));
}

function createArtifactFileMap(artifact: GeneratedContractArtifact): Readonly<Record<string, string>> {
  const files: Record<string, string> = {
    "Move.toml": artifact.moveToml,
  };

  for (const file of artifact.sourceFiles ?? [{ path: artifact.sourceFilePath, content: artifact.moveSource }]) {
    files[file.path] = file.content;
  }

  return files;
}

function selectArtifactModules(
  rebuiltModules: readonly string[],
  artifact: GeneratedContractArtifact,
): readonly string[] {
  const expectedModuleCount = artifact.bytecodeModules.length;

  if (expectedModuleCount === 0 || rebuiltModules.length === expectedModuleCount) {
    return rebuiltModules;
  }

  if (rebuiltModules.length < expectedModuleCount) {
    throw new Error("Local publish rebuild returned fewer modules than the compiled artifact.");
  }

  return rebuiltModules.slice(-expectedModuleCount);
}

/**
 * Resolve the module bytecode that should be published to a local validator.
 */
export async function resolveLocalPublishModules(
  artifact: GeneratedContractArtifact,
  dependencies: LocalPublishDependencies = {},
): Promise<readonly Uint8Array[]> {
  if (!artifactBundlesWorldShim(artifact)) {
    return artifact.bytecodeModules;
  }

  const verifyCompilerIntegrity = dependencies.verifyCompilerIntegrity ?? verifyMoveBuilderLiteIntegrity;
  const loadCompilerModule = dependencies.loadCompilerModule ?? loadMoveBuilderLite;
  await verifyCompilerIntegrity();
  const compilerModule = await loadCompilerModule();
  await compilerModule.initMoveCompiler({ wasm: moveBuilderLiteWasmUrl });
  const result = await compilerModule.buildMovePackage({
    files: createArtifactFileMap(artifact),
    silenceWarnings: false,
    network: "testnet",
  });

  if (!("modules" in result)) {
    throw new Error(`Local publish could not rebuild bundled dependency modules: ${result.error}`);
  }

  return selectArtifactModules(result.modules, artifact).map((moduleBytes) => decodeBase64(moduleBytes));
}

/**
 * Publish a compiled artifact to a project-controlled local validator.
 */
export async function publishToLocalValidator(request: LocalPublishRequest, dependencies: LocalPublishDependencies = {}): Promise<LocalPublishResult> {
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
  const modules = await resolveLocalPublishModules(request.artifact, dependencies);
  const transaction = new Transaction();
  const [upgradeCap] = transaction.publish({
    modules: modules.map((module) => Array.from(module)),
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