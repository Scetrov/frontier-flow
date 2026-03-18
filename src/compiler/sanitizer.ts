import type { IRGraph, IRNode } from "./types";

/**
 * Sanitize a user-provided label into a lowercase Move-safe identifier, prefixing numeric starts when needed.
 */
export function sanitizeIdentifier(input: string, fallback = "generated_identifier"): string {
  const trimmed = input.trim();
  const collapsed = trimmed
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const candidate = collapsed.length > 0 ? collapsed : fallback;
  return /^[A-Za-z_]/.test(candidate) ? candidate.toLowerCase() : `id_${candidate.toLowerCase()}`;
}

function sanitizeNode(node: IRNode): IRNode {
  return {
    ...node,
    label: sanitizeIdentifier(node.label, node.type),
  };
}

/**
 * Apply strict identifier sanitization to the IR graph before emission.
 */
export function sanitizeGraph(graph: IRGraph): IRGraph {
  return {
    ...graph,
    moduleName: sanitizeIdentifier(graph.moduleName, "frontier_flow"),
    nodes: new Map(Array.from(graph.nodes.entries(), ([nodeId, node]) => [nodeId, sanitizeNode(node)])),
  };
}