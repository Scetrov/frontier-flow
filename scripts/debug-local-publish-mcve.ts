import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

import { loadMoveBuilderLite, moveBuilderLiteWasmUrl, verifyMoveBuilderLiteIntegrity } from "../src/compiler/moveBuilderLite";
import { compileableSmartTurretExtensions, type GraphFixture } from "../src/__fixtures__/graphs/smartTurretExtensionFixtures";
import { compilePipeline } from "../src/compiler/pipeline";
import { getDeploymentTarget } from "../src/data/deploymentTargets";
import { createDefaultContractFlow } from "../src/data/kitchenSinkFlow";
import { createFlowNodeData, getNodeDefinition } from "../src/data/node-definitions";
import { prepareArtifactManifestForTarget } from "../src/compiler/emitter";
import type { GeneratedContractArtifact } from "../src/compiler/types";

import type { FlowEdge, FlowNode } from "../src/types/nodes";

interface ScriptOptions {
  readonly fixtureId: string;
  readonly includeWorldShim: boolean;
  readonly targetId: "local";
  readonly dryRun: boolean;
}

function parseArgs(argv: readonly string[]): ScriptOptions {
  let fixtureId = "default";
  let dryRun = false;
  let includeWorldShim = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--fixture") {
      fixtureId = argv[index + 1] ?? fixtureId;
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--include-world-shim") {
      includeWorldShim = true;
      continue;
    }
  }

  return {
    fixtureId,
    includeWorldShim,
    targetId: "local",
    dryRun,
  };
}

function printHelp(): void {
  console.log([
    "Usage: bun run debug:local-publish-mcve --fixture <id> [--dry-run] [--include-world-shim]",
    "",
    "Fixtures:",
    "  default",
    ...compileableSmartTurretExtensions.map((fixture) => `  ${fixture.extensionId}`),
  ].join("\n"));
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(globalThis.atob(value), (character) => character.charCodeAt(0));
}

async function compileArtifactWithBundledWorldShim(artifact: GeneratedContractArtifact): Promise<readonly Uint8Array[]> {
  await verifyMoveBuilderLiteIntegrity();
  const compilerModule = await loadMoveBuilderLite();
  await compilerModule.initMoveCompiler({ wasm: moveBuilderLiteWasmUrl });

  const files: Record<string, string> = {
    "Move.toml": artifact.moveToml,
  };
  for (const file of artifact.sourceFiles ?? [{ path: artifact.sourceFilePath, content: artifact.moveSource }]) {
    files[file.path] = file.content;
  }

  const result = await compilerModule.buildMovePackage({
    files,
    silenceWarnings: false,
    network: "testnet",
  });

  if (!("modules" in result)) {
    throw new Error(`Bundled-world compile failed: ${result.error}`);
  }

  return result.modules.map((moduleBytes) => decodeBase64(moduleBytes));
}

function createFlowNode(id: string, type: string, position: { readonly x: number; readonly y: number }): FlowNode {
  const definition = getNodeDefinition(type);
  if (definition === undefined) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id,
    type,
    position,
    data: createFlowNodeData(definition),
  };
}

function createFlowFromFixture(fixture: GraphFixture): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] } {
  return {
    nodes: fixture.nodes.map((node) => createFlowNode(node.id, node.type, node.position)),
    edges: fixture.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
  };
}

function resolveFixtureFlow(fixtureId: string): { readonly fixtureName: string; readonly flow: { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] }; readonly moduleName: string } {
  if (fixtureId === "default") {
    const flow = createDefaultContractFlow();
    return {
      fixtureName: "default",
      flow,
      moduleName: "starter_contract",
    };
  }

  const fixture = compileableSmartTurretExtensions.find((candidate) => candidate.extensionId === fixtureId);
  if (fixture === undefined) {
    throw new Error(`Unknown fixture '${fixtureId}'. Use --help to list available fixtures.`);
  }

  return {
    fixtureName: fixture.extensionId,
    flow: createFlowFromFixture(fixture.fixture),
    moduleName: fixture.fixture.moduleName,
  };
}

function formatBytecodePreview(moduleBytes: Uint8Array): string {
  return Array.from(moduleBytes.slice(0, 24), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function createPublishTransaction(input: {
  readonly dependencies: readonly string[];
  readonly ownerAddress: string;
  readonly modules: readonly Uint8Array[];
  readonly client: SuiJsonRpcClient;
}): Promise<{ readonly transaction: Transaction; readonly builtBytes: Uint8Array; readonly json: string }> {
  const transaction = new Transaction();
  const [upgradeCap] = transaction.publish({
    modules: input.modules.map((module) => Array.from(module)),
    dependencies: Array.from(input.dependencies),
  });
  transaction.transferObjects([upgradeCap], input.ownerAddress);
  transaction.setSenderIfNotSet(input.ownerAddress);

  const builtBytes = await transaction.build({ client: input.client });
  const json = await transaction.toJSON({ client: input.client });

  return {
    transaction,
    builtBytes,
    json: JSON.stringify(json, null, 2),
  };
}

function logArtifactSummary(input: {
  readonly moveToml: string;
  readonly sourceFilePath: string;
  readonly dependencies: readonly string[];
  readonly fixtureName: string;
  readonly moduleName: string;
  readonly modules: readonly Uint8Array[];
  readonly moveSourcePreview: string;
  readonly builtBytes?: Uint8Array;
  readonly transactionJson?: string;
}): void {
  console.log(`fixture: ${input.fixtureName}`);
  console.log(`module: ${input.moduleName}`);
  console.log(`source file: ${input.sourceFilePath}`);
  console.log("Move.toml:");
  console.log(input.moveToml);
  console.log("move source preview:");
  console.log(input.moveSourcePreview);
  console.log(`compiled modules: ${String(input.modules.length)}`);
  input.modules.forEach((moduleBytes, index) => {
    console.log(`  module[${String(index)}]: ${String(moduleBytes.length)} bytes preview=${formatBytecodePreview(moduleBytes)}`);
  });
  console.log(`dependencies (${String(input.dependencies.length)}):`);
  input.dependencies.forEach((dependency, index) => {
    console.log(`  [${String(index)}] ${dependency}`);
  });
  if (input.builtBytes !== undefined) {
    console.log(`transaction bytes: ${String(input.builtBytes.length)}`);
  }
  if (input.transactionJson !== undefined) {
    console.log("transaction json:");
    console.log(input.transactionJson);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  const selection = resolveFixtureFlow(options.fixtureId);
  const pipelineResult = await compilePipeline({
    nodes: selection.flow.nodes,
    edges: selection.flow.edges,
    moduleName: selection.moduleName,
  });

  if (pipelineResult.status.state !== "compiled" || pipelineResult.artifact == null) {
    const diagnostics = pipelineResult.diagnostics.map((diagnostic) => diagnostic.rawMessage).join("\n\n");
    throw new Error(`Compilation failed for fixture '${selection.fixtureName}'.\n${diagnostics}`);
  }

  const artifact = pipelineResult.artifact;
  const target = getDeploymentTarget(options.targetId);
  const manifest = prepareArtifactManifestForTarget(artifact.moduleName, target.id, artifact.dependencies);
  const modules = options.includeWorldShim
    ? await compileArtifactWithBundledWorldShim(artifact)
    : artifact.bytecodeModules;
  const signer = new Ed25519Keypair();
  const signerAddress = signer.getPublicKey().toSuiAddress();
  const client = new SuiJsonRpcClient({ url: target.rpcUrl, network: "localnet" });

  logArtifactSummary({
    moveToml: artifact.moveToml,
    sourceFilePath: artifact.sourceFilePath,
    dependencies: manifest.dependencies,
    fixtureName: selection.fixtureName,
    moduleName: artifact.moduleName,
    modules,
    moveSourcePreview: artifact.moveSource.split("\n").slice(0, 32).join("\n"),
  });

  let builtTransaction: Awaited<ReturnType<typeof createPublishTransaction>>;
  try {
    builtTransaction = await createPublishTransaction({
      dependencies: manifest.dependencies,
      ownerAddress: signerAddress,
      modules,
      client,
    });
    logArtifactSummary({
      moveToml: artifact.moveToml,
      sourceFilePath: artifact.sourceFilePath,
      dependencies: manifest.dependencies,
      fixtureName: selection.fixtureName,
      moduleName: artifact.moduleName,
      modules,
      moveSourcePreview: artifact.moveSource.split("\n").slice(0, 32).join("\n"),
      builtBytes: builtTransaction.builtBytes,
      transactionJson: builtTransaction.json,
    });
  } catch (error) {
    console.error("transaction build failed before publish attempt");
    throw error;
  }

  if (options.dryRun) {
    console.log("dry-run complete: local publish was not attempted.");
    return;
  }

  console.log(`requesting localnet faucet funds for ${signerAddress}`);
  await requestSuiFromFaucetV2({
    host: getFaucetHost("localnet"),
    recipient: signerAddress,
  });

  console.log("executing local publish transaction");
  const result = await client.signAndExecuteTransaction({
    transaction: builtTransaction.transaction,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showRawEffects: true,
    },
  });

  const packageId = result.objectChanges?.find((change) => change.type === "published")?.packageId;
  console.log(`publish digest: ${result.digest}`);
  console.log(`package id: ${packageId ?? "<missing>"}`);
  console.log(`effects status: ${result.effects?.status.status ?? "<missing>"}`);
}

await main();