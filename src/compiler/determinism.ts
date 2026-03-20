import type { FlowEdge, FlowNode } from "../types/nodes";

import type { GeneratedContractArtifact } from "./types";

export interface StableOrderResult {
  readonly order: readonly string[];
  readonly unresolvedNodeIds: readonly string[];
}

export function normalizeModuleName(input: string): string {
  const collapsed = input
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const value = collapsed.length > 0 ? collapsed : "frontier_flow";
  return /^[A-Za-z_]/.test(value) ? value.toLowerCase() : `module_${value.toLowerCase()}`;
}

export function createStableNodeOrder(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): StableOrderResult {
  const sortedIds = nodes.map((node) => node.id).sort();
  const { adjacency, indegree } = createTopology(sortedIds, edges);
  const order = drainStableQueue(sortedIds, adjacency, indegree);
  const unresolvedNodeIds = sortedIds.filter((nodeId) => !order.includes(nodeId));

  return unresolvedNodeIds.length === 0
    ? {
        order,
        unresolvedNodeIds: [],
      }
    : {
        order: order.concat(unresolvedNodeIds),
        unresolvedNodeIds,
      };
}

function createTopology(sortedIds: readonly string[], edges: readonly FlowEdge[]) {
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const nodeId of sortedIds) {
    adjacency.set(nodeId, []);
    indegree.set(nodeId, 0);
  }

  for (const edge of edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) {
      continue;
    }

    adjacency.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  for (const targets of adjacency.values()) {
    targets.sort();
  }

  return { adjacency, indegree };
}

function drainStableQueue(adjacencySeed: readonly string[], adjacency: Map<string, string[]>, indegree: Map<string, number>): string[] {
  const queue = adjacencySeed.filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    queue.sort();
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    order.push(current);

    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  return order;
}

function hashString(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createArtifactId(moduleName: string, requestedModuleName: string, moveToml: string, moveSource: string): string {
  return `${moduleName}-${hashString([requestedModuleName, moveToml, moveSource].join("\n::\n"))}`;
}

export function createArtifactFingerprint(artifact: Pick<GeneratedContractArtifact, "artifactId" | "moduleName" | "sourceFilePath" | "moveToml" | "moveSource" | "dependencies">): string {
  return [
    artifact.artifactId ?? "unknown-artifact",
    artifact.moduleName,
    artifact.sourceFilePath,
    artifact.moveToml,
    artifact.moveSource,
    [...artifact.dependencies].sort().join(","),
  ].join("\n---\n");
}

export function sortUniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}