import type { IRGraph, IRNode } from "./types";

export function sanitiseIdentifier(input: string, fallback = "generated_identifier"): string {
  const trimmed = input.trim();
  const collapsed = trimmed
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const candidate = collapsed.length > 0 ? collapsed : fallback;
  return /^[A-Za-z_]/.test(candidate) ? candidate.toLowerCase() : `id_${candidate.toLowerCase()}`;
}

function sanitiseNode(node: IRNode): IRNode {
  return {
    ...node,
    label: sanitiseIdentifier(node.label, node.type),
  };
}

/**
 * Apply strict identifier sanitisation to the IR graph before emission.
 */
export function sanitiseGraph(graph: IRGraph): IRGraph {
  return {
    ...graph,
    moduleName: sanitiseIdentifier(graph.moduleName, "frontier_flow"),
    nodes: new Map(Array.from(graph.nodes.entries(), ([nodeId, node]) => [nodeId, sanitiseNode(node)])),
  };
}