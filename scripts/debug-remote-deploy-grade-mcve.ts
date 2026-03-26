import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";

import { compileableSmartTurretExtensions, type GraphFixture } from "../src/__fixtures__/graphs/smartTurretExtensionFixtures";
import { compileForDeployment } from "../src/compiler/deployGradeCompiler";
import { compilePipeline } from "../src/compiler/pipeline";
import { getDeploymentTarget } from "../src/data/deploymentTargets";
import { createDefaultContractFlow } from "../src/data/kitchenSinkFlow";
import { createFlowNodeData, getNodeDefinition } from "../src/data/node-definitions";
import { getPackageReferenceBundle } from "../src/data/packageReferences";
import { publishToRemoteTarget } from "../src/deployment/publishRemote";
import { fetchWorldSource, WORLD_CONTRACTS_REPOSITORY_URL } from "../src/deployment/worldSourceFetcher";

import type { FlowEdge, FlowNode } from "../src/types/nodes";

type ScriptTargetId = "testnet:stillness" | "testnet:utopia" | "local:evefrontier";

interface ScriptOptions {
  readonly fixtureId: string;
  readonly targetId: ScriptTargetId;
  readonly sender: string;
  readonly resolveTransaction: boolean;
}

function printHelp(): void {
  console.log([
    "Usage: bun run debug:remote-deploy-grade-mcve --fixture <id> --target <testnet:stillness|testnet:utopia|local:evefrontier> [--sender <0x...>] [--resolve-transaction]",
    "",
    "Targets:",
    "  testnet:stillness      deploy-grade compile + dry-run transaction (use --sender for RPC resolve)",
    "  testnet:utopia         deploy-grade compile + dry-run transaction",
    "  local:evefrontier      deploy-grade compile + keypair-signed publish to http://127.0.0.1:9000 (use --resolve-transaction to actually publish)",
    "",
    "Note: for local:evefrontier the --sender arg is ignored; a fresh ephemeral keypair is generated and funded via the local faucet.",
    "",
    "Fixtures:",
    "  default",
    ...compileableSmartTurretExtensions.map((fixture) => `  ${fixture.extensionId}`),
  ].join("\n"));
}

function parseArgs(argv: readonly string[]): ScriptOptions {
  let fixtureId = "default";
  let targetId: ScriptTargetId = "testnet:stillness";
  let sender = "0x1111111111111111111111111111111111111111111111111111111111111111";
  let resolveTransaction = false;

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

    if (arg === "--target") {
      const value = argv[index + 1];
      if (value === "testnet:stillness" || value === "testnet:utopia" || value === "local:evefrontier") {
        targetId = value;
      }
      index += 1;
      continue;
    }

    if (arg === "--sender") {
      sender = argv[index + 1] ?? sender;
      index += 1;
      continue;
    }

    if (arg === "--resolve-transaction") {
      resolveTransaction = true;
    }
  }

  return { fixtureId, targetId, sender, resolveTransaction };
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

async function executeWithLocalKeypair(
  client: SuiJsonRpcClient,
  transaction: Transaction,
): Promise<{ digest: string }> {
  const { getFaucetHost, requestSuiFromFaucetV2 } = await import("@mysten/sui/faucet");
  const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
  const signer = new Ed25519Keypair();
  const signerAddress = signer.getPublicKey().toSuiAddress();
  console.log(`local signer address: ${signerAddress}`);
  console.log("requesting SUI from local faucet...");
  await requestSuiFromFaucetV2({ host: getFaucetHost("localnet"), recipient: signerAddress });
  transaction.setSenderIfNotSet(signerAddress);
  const result = await client.signAndExecuteTransaction({
    transaction,
    signer,
    options: { showEffects: true, showObjectChanges: true },
  });
  const publishedChange = result.objectChanges?.find((change) => change.type === "published");
  const packageId = publishedChange && "packageId" in publishedChange ? publishedChange.packageId : undefined;
  if (packageId !== undefined) {
    console.log(`published package id: ${packageId}`);
  }
  console.log(`transaction digest: ${result.digest}`);
  return { digest: result.digest };
}

function logCompileSummary(input: {
  readonly fixtureName: string;
  readonly moduleName: string;
  readonly sourceVersionTag: string;
  readonly targetId: ScriptTargetId;
  readonly worldPackageId: string;
  readonly originalWorldPackageId: string;
  readonly dependencies: readonly string[];
  readonly modules: readonly Uint8Array[];
  readonly digest: readonly number[];
}): void {
  console.log(`fixture: ${input.fixtureName}`);
  console.log(`target: ${input.targetId}`);
  console.log(`module: ${input.moduleName}`);
  console.log(`world source version: ${input.sourceVersionTag}`);
  console.log(`world package id: ${input.worldPackageId}`);
  console.log(`world original package id: ${input.originalWorldPackageId}`);
  console.log(`compiled modules: ${String(input.modules.length)}`);
  input.modules.forEach((moduleBytes, index) => {
    console.log(`  module[${String(index)}]: ${String(moduleBytes.length)} bytes preview=${formatBytecodePreview(moduleBytes)}`);
  });
  console.log(`dependencies (${String(input.dependencies.length)}):`);
  input.dependencies.forEach((dependency, index) => {
    console.log(`  [${String(index)}] ${dependency}`);
  });
  console.log(`digest: ${input.digest.join(",")}`);
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

  const target = getDeploymentTarget(options.targetId);
  const references = getPackageReferenceBundle(options.targetId);
  const worldSource = await fetchWorldSource({
    repositoryUrl: WORLD_CONTRACTS_REPOSITORY_URL,
    versionTag: references.sourceVersionTag,
    subdirectory: "contracts/world",
  });
  const deployGradeResult = await compileForDeployment({
    artifact: pipelineResult.artifact,
    worldSource,
    target: references,
  });

  logCompileSummary({
    fixtureName: selection.fixtureName,
    moduleName: selection.moduleName,
    sourceVersionTag: worldSource.sourceVersionTag,
    targetId: options.targetId,
    worldPackageId: references.worldPackageId,
    originalWorldPackageId: references.originalWorldPackageId,
    dependencies: deployGradeResult.dependencies,
    modules: deployGradeResult.modules,
    digest: deployGradeResult.digest,
  });

  const isLocal = options.targetId === "local:evefrontier";
  const network = isLocal ? "localnet" : "testnet";
  const client = new SuiJsonRpcClient({ url: target.rpcUrl, network });

  await publishToRemoteTarget({
    compileResult: deployGradeResult,
    ownerAddress: isLocal ? "0x0000000000000000000000000000000000000000000000000000000000000001" : options.sender,
    target,
    references,
    execute: async (transaction) => {
      const data = transaction.getData();
      console.log(`transaction commands: ${data.commands.map((command) => command.$kind).join(", ")}`);
      const publishCommand = data.commands[0]?.$kind === "Publish" ? data.commands[0].Publish : undefined;
      if (publishCommand !== undefined) {
        console.log(`publish command dependency count: ${String(publishCommand.dependencies.length)}`);
        publishCommand.dependencies.forEach((dependency, index) => {
          console.log(`  publish dependency[${String(index)}]: ${dependency}`);
        });
      }

      if (isLocal && options.resolveTransaction) {
        return executeWithLocalKeypair(client, transaction);
      }

      if (!isLocal) {
        transaction.setSenderIfNotSet(options.sender);
      }

      if (!options.resolveTransaction) {
        console.log(`${isLocal ? "local" : "remote"} deploy-grade dry-run complete: transaction was not resolved against RPC.`);
        return { digest: "dry-run" };
      }

      const builtBytes = await transaction.build({ client });
      console.log(`resolved transaction bytes: ${String(builtBytes.length)}`);
      return { digest: "resolved-dry-run" };
    },
  });
}

await main();