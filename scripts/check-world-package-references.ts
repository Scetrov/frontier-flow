#!/usr/bin/env bun

/**
 * Repository integrity validation for maintained World package references.
 *
 * Checks each maintained remote target against four validation layers:
 *   1. Current manifest: upstream Published.toml on main matches checked-in bundle
 *   2. Source provenance: pinned tag contains matching publication metadata
 *   3. Cache alignment: deploy-cache manifest maps to the correct snapshot
 *   4. On-chain coherence: Sui testnet package and registry objects are valid
 *
 * Uses fixed HTTPS hosts, bounded timeouts, bounded retries, structural
 * validation, and credential-safe diagnostics. Exits non-zero on drift or
 * unverifiable state.
 */

import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import {
  MAINTAINED_WORLD_PACKAGE_REFERENCES,
  type MaintainedWorldPackageReference,
} from "../src/data/maintainedWorldPackageReferences";
import { parsePublishedManifestStrict } from "../src/data/publishedManifestParser";
import { createSnapshotValidationResult, parseBundledDependencySnapshot } from "../src/deployment/dependencySnapshotValidation";

// ---- Configuration ----

type MaintainedTargetConfig = MaintainedWorldPackageReference;

const RAW_GITHUB_HOST = "https://raw.githubusercontent.com";
const SUI_TESTNET_GRAPHQL = "https://graphql.testnet.sui.io/graphql";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000;

/**
 * Checked-in maintained target configuration.
 * Keep this in sync with PACKAGE_REFERENCE_BUNDLES in packageReferences.ts.
 */
const MAINTAINED_TARGETS: readonly MaintainedTargetConfig[] = MAINTAINED_WORLD_PACKAGE_REFERENCES;

// Section names in Published.toml for each target
const TARGET_SECTION_NAMES: Record<string, string> = {
  "testnet:stillness": "testnet_stillness",
  "testnet:utopia": "testnet_utopia",
};

// ---- Types ----

export interface FetchClient {
  readonly fetch: typeof fetch;
}

interface CheckResult {
  readonly passed: boolean;
  readonly targetId: string;
  readonly layer: string;
  readonly message: string;
  readonly details?: string;
}


// ---- Network helpers ----

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms: ${label}`)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function fetchWithRetries(
  client: FetchClient,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        client.fetch(url, init),
        REQUEST_TIMEOUT_MS,
        `fetch ${url}`,
      );
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt + 1 < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error(`Exhausted ${MAX_RETRIES} retries for ${url}`);
}

// ---- Layer 1: Current manifest check ----

async function checkCurrentManifest(
  client: FetchClient,
  target: MaintainedTargetConfig,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const sectionName = TARGET_SECTION_NAMES[target.targetId];
  if (sectionName === undefined) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "current-manifest",
      message: `No section name mapping for target "${target.targetId}"`,
    });
    return results;
  }

  const url = `${RAW_GITHUB_HOST}/evefrontier/world-contracts/main/contracts/world/Published.toml`;

  try {
    const response = await fetchWithRetries(client, url);
    if (!response.ok) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "current-manifest",
        message: `Failed to fetch current manifest: HTTP ${response.status}`,
      });
      return results;
    }

    const manifest = await response.text();
    const parsed = parsePublishedManifestStrict(manifest);
    if (!parsed.ok) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "current-manifest",
        message: `Malformed current manifest: ${parsed.errors.map((error) => error.message).join("; ")}`,
      });
      return results;
    }
    const section = parsed.targets.get(target.targetId);
    if (section === undefined) {
      results.push({ passed: false, targetId: target.targetId, layer: "current-manifest", message: `Missing section for ${target.targetId}` });
      return results;
    }

    const fieldChecks: Array<{ field: string; expected: string; actual: string }> = [
      { field: "published-at", expected: target.worldPackageId, actual: section.worldPackageId },
      { field: "original-id", expected: target.originalWorldPackageId, actual: section.originalWorldPackageId },
      { field: "toolchain-version", expected: target.toolchainVersion, actual: section.toolchainVersion },
    ];

    let allMatch = true;
    const drifted: string[] = [];
    for (const check of fieldChecks) {
      if (check.expected !== check.actual) {
        allMatch = false;
        drifted.push(`  ${check.field}: expected "${check.expected}", found "${check.actual}"`);
      }
    }

    results.push({
      passed: allMatch,
      targetId: target.targetId,
      layer: "current-manifest",
      message: allMatch
        ? `Current manifest matches checked-in bundle for ${target.targetId}`
        : `Current manifest drifted for ${target.targetId}:\n${drifted.join("\n")}`,
    });
  } catch (error) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "current-manifest",
      message: `Unreachable: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return results;
}

// ---- Layer 2: Pinned source-tag check ----

async function checkPinnedSourceTag(
  client: FetchClient,
  target: MaintainedTargetConfig,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const sectionName = TARGET_SECTION_NAMES[target.targetId];
  if (sectionName === undefined) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "source-tag",
      message: `No section name mapping for target "${target.targetId}"`,
    });
    return results;
  }

  const url = `${RAW_GITHUB_HOST}/evefrontier/world-contracts/${target.sourceVersionTag}/contracts/world/Published.toml`;

  try {
    const response = await fetchWithRetries(client, url);
    if (!response.ok) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "source-tag",
        message: `Failed to fetch tag ${target.sourceVersionTag} manifest: HTTP ${response.status}`,
      });
      return results;
    }

    const manifest = await response.text();
    const parsed = parsePublishedManifestStrict(manifest);
    if (!parsed.ok) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "source-tag",
        message: `Malformed source-tag manifest: ${parsed.errors.map((error) => error.message).join("; ")}`,
      });
      return results;
    }
    const section = parsed.targets.get(target.targetId);
    if (section === undefined) {
      results.push({ passed: false, targetId: target.targetId, layer: "source-tag", message: `Missing section for ${target.targetId}` });
      return results;
    }

    const fieldChecks: Array<{ field: string; expected: string; actual: string }> = [
      { field: "published-at", expected: target.worldPackageId, actual: section.worldPackageId },
      { field: "original-id", expected: target.originalWorldPackageId, actual: section.originalWorldPackageId },
      { field: "toolchain-version", expected: target.toolchainVersion, actual: section.toolchainVersion },
    ];

    let allMatch = true;
    const drifted: string[] = [];
    for (const check of fieldChecks) {
      if (check.expected !== check.actual) {
        allMatch = false;
        drifted.push(`  ${check.field}: expected "${check.expected}", found "${check.actual}"`);
      }
    }

    results.push({
      passed: allMatch,
      targetId: target.targetId,
      layer: "source-tag",
      message: allMatch
        ? `Source tag ${target.sourceVersionTag} matches checked-in bundle for ${target.targetId}`
        : `Source tag ${target.sourceVersionTag} identity mismatch for ${target.targetId}:\n${drifted.join("\n")}`,
    });
  } catch (error) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "source-tag",
      message: `Unreachable: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return results;
}

// ---- Layer 3: Deploy-cache check ----

interface CacheManifestEntry {
  sourceVersionTag: string;
  repositoryUrl: string;
  subdirectory: string;
  outputPath: string;
  targets: readonly string[];
}

async function checkDeployCache(
  _client: FetchClient,
  target: MaintainedTargetConfig,
  repoRoot: string,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Load the cache manifest
  const manifestPath = resolvePath(repoRoot, "scripts/deploy-cache-packages.json");
  let cacheManifest: { snapshots: CacheManifestEntry[] };

  try {
    const raw = await readFile(manifestPath, "utf-8");
    cacheManifest = JSON.parse(raw) as { snapshots: CacheManifestEntry[] };
    if (!Array.isArray(cacheManifest.snapshots)) {
      throw new Error("Invalid manifest shape");
    }
  } catch (error) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "deploy-cache",
      message: `Failed to read deploy-cache manifest: ${error instanceof Error ? error.message : String(error)}`,
    });
    return results;
  }

  // Find the snapshot for this target
  const snapshot = cacheManifest.snapshots.find((s) => s.targets.includes(target.targetId));
  if (snapshot === undefined) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "deploy-cache",
      message: `No deploy-cache snapshot configured for target ${target.targetId}`,
    });
    return results;
  }

  // Verify source tag mapping
  if (snapshot.sourceVersionTag !== target.sourceVersionTag) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "deploy-cache",
      message: `Cache source tag mismatch: expected "${target.sourceVersionTag}", found "${snapshot.sourceVersionTag}"`,
    });
    return results;
  }

  // Verify snapshot file exists
  const snapshotPath = resolvePath(repoRoot, snapshot.outputPath);
  try {
    const snapshotContent = await readFile(snapshotPath, "utf-8");
    const snapshotData = JSON.parse(snapshotContent) as Record<string, unknown>;

    if (snapshotData.sourceVersionTag !== target.sourceVersionTag) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "deploy-cache",
        message: `Snapshot sourceVersionTag mismatch: expected "${target.sourceVersionTag}", found "${String(snapshotData.sourceVersionTag)}"`,
      });
      return results;
    }

    const snapshot = parseBundledDependencySnapshot(snapshotData);
    if (snapshot === null || snapshot.sourceVersionTag !== target.sourceVersionTag) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "deploy-cache",
        message: `Snapshot has invalid identity or resolvedDependencies shape for tag ${target.sourceVersionTag}`,
      });
      return results;
    }

    const validation = createSnapshotValidationResult(snapshot.resolvedDependencies);
    if (!validation.isValid) {
      results.push({
        passed: false,
        targetId: target.targetId,
        layer: "deploy-cache",
        message: `Snapshot failed dependency payload validation: ${validation.message}`,
      });
      return results;
    }
  } catch (error) {
    results.push({
      passed: false,
      targetId: target.targetId,
      layer: "deploy-cache",
      message: `Failed to read snapshot: ${error instanceof Error ? error.message : String(error)}`,
    });
    return results;
  }

  results.push({
    passed: true,
    targetId: target.targetId,
    layer: "deploy-cache",
    message: `Cache alignment verified: ${snapshot.outputPath} matches ${target.sourceVersionTag}`,
  });

  return results;
}

// ---- Layer 4: Sui testnet on-chain check ----

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: ReadonlyArray<{ message: string }>;
}

async function postGraphQl<T>(
  client: FetchClient,
  endpoint: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetchWithRetries(client, endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors !== undefined && json.errors.length > 0) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  if (json.data === undefined || json.data === null) {
    throw new Error("GraphQL response has no data");
  }

  return json.data;
}

const OBJECT_QUERY = `
  query Object($id: SuiAddress!) {
    object(address: $id) {
      address
      asMovePackage { address }
      asMoveObject { contents { type { repr } } }
    }
  }
`;

const PUBLICATION_TRANSACTION_QUERY = `
  query PublicationTransaction($digest: String!) {
    transaction(digest: $digest) {
      digest
      effects {
        objectChanges(first: 100) {
          nodes {
            address
            idCreated
            outputState {
              asMovePackage { address }
              asMoveObject { contents { type { repr } } }
            }
          }
        }
      }
    }
  }
`;

interface OnChainObject {
  readonly address: string;
  readonly isPackage: boolean;
  readonly moveType?: string;
}

function sameObjectId(left: string, right: string): boolean {
  const normalize = (value: string) => `0x${value.slice(2).replace(/^0+/, "").toLowerCase() || "0"}`;
  return normalize(left) === normalize(right);
}

async function getObject(
  client: FetchClient,
  endpoint: string,
  objectId: string,
  label: string,
): Promise<OnChainObject | null> {
  try {
    const data = await postGraphQl<{
      object: {
        address?: string;
        asMovePackage?: { address?: string } | null;
        asMoveObject?: { contents?: { type?: { repr?: string } } } | null;
      } | null;
    }>(client, endpoint, OBJECT_QUERY, { id: objectId });
    if (data.object === null) return null;
    if (typeof data.object.address !== "string" || !sameObjectId(data.object.address, objectId)) {
      throw new Error(`Response address "${String(data.object.address)}" did not match requested object ID`);
    }
    return {
      address: data.object.address,
      isPackage: data.object.asMovePackage !== null && data.object.asMovePackage !== undefined,
      moveType: data.object.asMoveObject?.contents?.type?.repr,
    };
  } catch (error) {
    throw new Error(`Failed to check ${label} (${objectId}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expectedRegistryType(target: MaintainedTargetConfig, module: "object_registry" | "access", struct: "ObjectRegistry" | "ServerAddressRegistry"): string {
  return `${target.originalWorldPackageId}::${module}::${struct}`;
}

async function checkPublicationProvenance(client: FetchClient, target: MaintainedTargetConfig): Promise<CheckResult> {
  try {
    const data = await postGraphQl<{
      transaction: {
        digest?: string;
        effects?: { objectChanges?: { nodes?: ReadonlyArray<{
          address?: string;
          idCreated?: boolean;
          outputState?: { asMovePackage?: { address?: string } | null; asMoveObject?: { contents?: { type?: { repr?: string } } } | null } | null;
        }> } } | null;
      } | null;
    }>(client, SUI_TESTNET_GRAPHQL, PUBLICATION_TRANSACTION_QUERY, { digest: target.publicationTransaction });
    const transaction = data.transaction;
    const changes = transaction?.effects?.objectChanges?.nodes;
    if (transaction === null || transaction === undefined || transaction.digest !== target.publicationTransaction || changes === undefined) {
      throw new Error("Publication transaction response was incomplete or did not match the pinned digest");
    }

    const createdObjects = changes.filter((change) => change.idCreated === true && typeof change.address === "string");
    const originalPackageCreated = createdObjects.some((change) => sameObjectId(change.address as string, target.originalWorldPackageId)
      && change.outputState?.asMovePackage !== null && change.outputState?.asMovePackage !== undefined);
    const expectedRegistries = [
      [target.objectRegistryId, expectedRegistryType(target, "object_registry", "ObjectRegistry")],
      [target.serverAddressRegistryId, expectedRegistryType(target, "access", "ServerAddressRegistry")],
    ] as const;
    const missing = expectedRegistries.filter(([id, type]) => !createdObjects.some((change) => sameObjectId(change.address as string, id)
      && change.outputState?.asMoveObject?.contents?.type?.repr === type));

    if (!originalPackageCreated || missing.length > 0) {
      const missingDescriptions = missing.map(([id, type]) => `${id} (${type})`).join(", ");
      throw new Error(`Pinned publication transaction did not create ${[!originalPackageCreated ? target.originalWorldPackageId : "", missingDescriptions].filter(Boolean).join(", ")}`);
    }

    return { passed: true, targetId: target.targetId, layer: "on-chain", message: `Publication transaction ${target.publicationTransaction} created the original package and configured registries` };
  } catch (error) {
    return { passed: false, targetId: target.targetId, layer: "on-chain", message: error instanceof Error ? error.message : String(error) };
  }
}

async function checkOnChain(client: FetchClient, target: MaintainedTargetConfig): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  try {
    const worldPackage = await getObject(client, SUI_TESTNET_GRAPHQL, target.worldPackageId, "world package");
    if (worldPackage === null || !worldPackage.isPackage) throw new Error(`World package ${target.worldPackageId} does not exist as a Move package`);
    results.push({ passed: true, targetId: target.targetId, layer: "on-chain", message: `World package ${target.worldPackageId.slice(0, 10)}... exists on testnet` });

    for (const [label, id, type] of [
      ["Object registry", target.objectRegistryId, expectedRegistryType(target, "object_registry", "ObjectRegistry")],
      ["Server address registry", target.serverAddressRegistryId, expectedRegistryType(target, "access", "ServerAddressRegistry")],
    ] as const) {
      const registry = await getObject(client, SUI_TESTNET_GRAPHQL, id, label.toLowerCase());
      if (registry === null) throw new Error(`${label} ${id} does not exist on Sui testnet`);
      if (registry.moveType !== type) throw new Error(`${label} type "${String(registry.moveType)}" did not equal expected "${type}"`);
      results.push({ passed: true, targetId: target.targetId, layer: "on-chain", message: `${label} ${id.slice(0, 10)}... has the expected type` });
    }
  } catch (error) {
    results.push({ passed: false, targetId: target.targetId, layer: "on-chain", message: error instanceof Error ? error.message : String(error) });
    return results;
  }

  results.push(await checkPublicationProvenance(client, target));
  return results;
}

// ---- Main runner ----

export interface ValidationInput {
  readonly client?: FetchClient;
  readonly repoRoot?: string;
}

export interface ValidationOutput {
  readonly results: readonly CheckResult[];
  readonly allPassed: boolean;
  readonly targetSummaries: readonly TargetSummary[];
}

export interface TargetSummary {
  readonly targetId: string;
  readonly passed: boolean;
  readonly resolvedUpstreamRevision?: string;
}

export async function runValidation(input: ValidationInput = {}): Promise<ValidationOutput> {
  const client: FetchClient = input.client ?? { fetch: globalThis.fetch };
  const repoRoot = input.repoRoot ?? resolvePath(import.meta.dirname ?? ".", "..");

  const allResults: CheckResult[] = [];
  const targetSummaries: TargetSummary[] = [];

  for (const target of MAINTAINED_TARGETS) {
    const layerResults = [
      ...await checkCurrentManifest(client, target),
      ...await checkPinnedSourceTag(client, target),
      ...await checkDeployCache(client, target, repoRoot),
      ...await checkOnChain(client, target),
    ];

    allResults.push(...layerResults);

    const allLayersPassed = layerResults.every((r) => r.passed);
    targetSummaries.push({
      targetId: target.targetId,
      passed: allLayersPassed,
      resolvedUpstreamRevision: allLayersPassed ? target.sourceVersionTag : undefined,
    });
  }

  return {
    results: allResults,
    allPassed: allResults.every((r) => r.passed),
    targetSummaries,
  };
}

// ---- CLI entry point ----

async function main(): Promise<void> {
  console.log("World Package Reference Integrity Check\n");
  console.log("=".repeat(50));

  const output = await runValidation();

  // Report each target
  for (const target of MAINTAINED_TARGETS) {
    const targetResults = output.results.filter((r) => r.targetId === target.targetId);

    console.log(`\n## ${target.environmentLabel} (${target.targetId})`);
    console.log(`  Source tag: ${target.sourceVersionTag}`);
    console.log(`  Toolchain:  ${target.toolchainVersion}`);

    for (const result of targetResults) {
      const icon = result.passed ? "✓" : "✗";
      console.log(`  ${icon} [${result.layer}] ${result.message}`);
    }
  }

  console.log("\n" + "=".repeat(50));

  // Summary
  const passedCount = output.targetSummaries.filter((t) => t.passed).length;
  console.log(`\nResult: ${passedCount}/${MAINTAINED_TARGETS.length} targets fully verified`);

  if (output.allPassed) {
    console.log("\nVerified upstream revisions:");
    for (const summary of output.targetSummaries) {
      if (summary.resolvedUpstreamRevision !== undefined) {
        console.log(`  ${summary.targetId}: ${summary.resolvedUpstreamRevision}`);
      }
    }
    process.exit(0);
  } else {
    console.log("\nFAILED: One or more validation checks did not pass.");
    console.log("Review the diagnostics above and update the checked-in bundle if drift is confirmed.");
    process.exit(1);
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(2);
  });
}
