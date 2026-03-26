import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { Transaction } from "@mysten/sui/transactions";

import { compileableSmartTurretExtensions, type GraphFixture } from "../src/__fixtures__/graphs/smartTurretExtensionFixtures";
import { compileForDeployment } from "../src/compiler/deployGradeCompiler";
import { emitMove } from "../src/compiler/emitter";
import { buildIrGraph } from "../src/compiler/irBuilder";
import { optimiseGraph } from "../src/compiler/optimiser";
import { collectSanitizationDiagnostics, sanitizeGraph } from "../src/compiler/sanitizer";
import { validateGraph } from "../src/compiler/validator";
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
  readonly worldPackageIdOverride: string | null;
  readonly rpcUrlOverride: string | null;
}

function printHelp(): void {
  console.log([
    "Usage: bun run debug:remote-deploy-grade-mcve --fixture <id> --target <testnet:stillness|testnet:utopia|local:evefrontier> [--sender <0x...>] [--resolve-transaction] [--world-package-id <0x...>] [--rpc-url <url>]",
    "",
    "Targets:",
    "  testnet:stillness      deploy-grade compile + dry-run transaction (use --sender for RPC resolve)",
    "  testnet:utopia         deploy-grade compile + dry-run transaction",
    "  local:evefrontier      deploy-grade compile + keypair-signed publish to http://127.0.0.1:9000 (use --resolve-transaction to actually publish)",
    "",
    "Overrides:",
    "  --world-package-id     Override the world package ID for the selected target (e.g. for a localnet with a different deployment)",
    "  --rpc-url              Override the RPC URL for the selected target",
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
  let worldPackageIdOverride: string | null = null;
  let rpcUrlOverride: string | null = null;

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

    if (arg === "--world-package-id") {
      worldPackageIdOverride = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--rpc-url") {
      rpcUrlOverride = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return { fixtureId, targetId, sender, resolveTransaction, worldPackageIdOverride, rpcUrlOverride };
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
  readonly dependencyLinkPackageId: string;
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
  console.log(`dependency link package id: ${input.dependencyLinkPackageId}`);
  console.log(`world package id: ${input.worldPackageId}`);
  console.log(`world original package id: ${input.originalWorldPackageId}`);
  if (input.dependencyLinkPackageId !== input.worldPackageId) {
    console.log("package id mismatch: deploy-grade dependency linking is using the original package id instead of the active runtime package id");
  }
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

  // Use emitter-only path: IR → validate → sanitize → optimize → emit
  // Skip the WASM authoring-time compilation since deploy-grade recompiles from source
  const irGraph = buildIrGraph(selection.flow.nodes, selection.flow.edges, selection.moduleName);
  const validation = validateGraph(irGraph);
  if (!validation.valid) {
    throw new Error(`IR validation failed for fixture '${selection.fixtureName}':\n${validation.diagnostics.map((d) => d.rawMessage).join("\n")}`);
  }
  const sanitizationDiagnostics = collectSanitizationDiagnostics(irGraph);
  if (sanitizationDiagnostics.some((d) => d.severity === "error")) {
    throw new Error(`Sanitization failed for fixture '${selection.fixtureName}':\n${sanitizationDiagnostics.map((d) => d.rawMessage).join("\n")}`);
  }
  const sanitizedGraph = sanitizeGraph(irGraph);
  const { graph: optimisedGraph } = optimiseGraph(sanitizedGraph);
  const emitted = emitMove(optimisedGraph);
  const artifact = emitted.artifact;

  console.log(`emitter output: ${artifact.moduleName} (${artifact.sourceFiles?.length ?? 0} source files)`);
  console.log(`move source:\n${artifact.moveSource}\n`);
  console.log(`Move.toml:\n${artifact.moveToml}\n`);
  console.log(`source files:`);
  for (const file of artifact.sourceFiles ?? []) {
    console.log(`  ${file.path} (${file.content.length} chars)`);
  }

  const target = getDeploymentTarget(options.targetId);
  const baseReferences = getPackageReferenceBundle(options.targetId);
  const references = options.worldPackageIdOverride !== null
    ? {
      ...baseReferences,
      worldPackageId: options.worldPackageIdOverride,
      originalWorldPackageId: options.worldPackageIdOverride,
    }
    : baseReferences;
  const effectiveRpcUrl = options.rpcUrlOverride ?? target.rpcUrl;

  if (options.worldPackageIdOverride !== null) {
    console.log(`world package id override: ${options.worldPackageIdOverride}`);
  }
  if (options.rpcUrlOverride !== null) {
    console.log(`rpc url override: ${options.rpcUrlOverride}`);
  }
  // Load cached resolution from disk to avoid GitHub rate limits
  const RESOLUTION_CACHE_FILE = `.deploy-grade-resolution-cache-${options.targetId.replace(/:/g, "-")}.json`;
  type CachedResolution = import("../src/compiler/types").CachedDependencyResolution;
  let cachedResolution: CachedResolution | undefined;

  if (existsSync(RESOLUTION_CACHE_FILE)) {
    const cached = JSON.parse(readFileSync(RESOLUTION_CACHE_FILE, "utf-8")) as CachedResolution;
    if (cached.sourceVersionTag === references.sourceVersionTag) {
      console.log(`using cached resolution from ${RESOLUTION_CACHE_FILE}`);
      cachedResolution = cached;
    } else {
      console.log(`cached resolution version mismatch (${cached.sourceVersionTag} !== ${references.sourceVersionTag}), re-resolving`);
    }
  }

  const worldSource = await fetchWorldSource({
    repositoryUrl: WORLD_CONTRACTS_REPOSITORY_URL,
    versionTag: references.sourceVersionTag,
    subdirectory: "contracts/world",
  });
  console.log(`world source fetched: ${worldSource.sourceVersionTag} (${Object.keys(worldSource.files).length} files)`);

  const deployGradeResult = await compileForDeployment({
    artifact,
    worldSource,
    target: references,
    cachedResolution,
    onProgress: (event) => {
      console.log(`deploy progress: ${event.phase} ${event.current !== undefined ? `${String(event.current)}/${String(event.total)}` : ""}`);
    },
  });

  // Save the resolved dependencies to disk for reuse
  if (deployGradeResult.resolvedDependencies) {
    const toCache: CachedResolution = {
      targetId: references.targetId as Exclude<typeof references.targetId, "local">,
      sourceVersionTag: references.sourceVersionTag,
      resolvedDependencies: deployGradeResult.resolvedDependencies,
      resolvedAt: Date.now(),
    };
    writeFileSync(RESOLUTION_CACHE_FILE, JSON.stringify(toCache, null, 2));
    console.log(`saved resolution cache to ${RESOLUTION_CACHE_FILE}`);
  }

  // Debug: inspect resolved dependency structure
  if (deployGradeResult.resolvedDependencies) {
    const depData = JSON.parse(deployGradeResult.resolvedDependencies.dependencies) as unknown[];
    console.log(`\n--- resolved dependency packages (${String(depData.length)}) ---`);
    for (const pkg of depData) {
      const p = pkg as { name?: string; id?: string; files?: Record<string, string> };
      const fileKeys = p.files !== undefined ? Object.keys(p.files) : [];
      const publishedToml = fileKeys.find((k) => /published\.toml/i.test(k));
      const moveToml = fileKeys.find((k) => /move\.toml/i.test(k));
      console.log(`  package: ${p.name ?? "?"} id=${p.id ?? "?"} files=${String(fileKeys.length)}`);
      if (p.name?.toLowerCase() === "world") {
        console.log(`    file keys: ${fileKeys.join(", ")}`);
      }
      if (publishedToml !== undefined && p.files !== undefined) {
        console.log(`    Published.toml: ${p.files[publishedToml]?.substring(0, 200)}`);
      }
      if (moveToml !== undefined && p.files !== undefined) {
        console.log(`    Move.toml:\n${p.files[moveToml]}`);
      }
    }
    console.log("--- end resolved dependency packages ---\n");
  }

  logCompileSummary({
    fixtureName: selection.fixtureName,
    moduleName: selection.moduleName,
    sourceVersionTag: worldSource.sourceVersionTag,
    targetId: options.targetId,
    dependencyLinkPackageId: references.originalWorldPackageId,
    worldPackageId: references.worldPackageId,
    originalWorldPackageId: references.originalWorldPackageId,
    dependencies: deployGradeResult.dependencies,
    modules: deployGradeResult.modules,
    digest: deployGradeResult.digest,
  });

  const isLocal = options.targetId === "local:evefrontier";
  const network = isLocal ? "localnet" : "testnet";
  const client = new SuiJsonRpcClient({ url: effectiveRpcUrl, network });

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