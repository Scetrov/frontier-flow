import type { CompilerDiagnostic, IRGraph, IRNode } from "./types";

interface IdentifierAnalysis {
  readonly sanitized: string;
  readonly requiredFallback: boolean;
}

function analyseIdentifier(input: string, fallback: string): IdentifierAnalysis {
  const trimmed = input.trim();
  const collapsed = trimmed
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const candidate = collapsed.length > 0 ? collapsed : fallback;
  return {
    sanitized: /^[A-Za-z_]/.test(candidate) ? candidate.toLowerCase() : `id_${candidate.toLowerCase()}`,
    requiredFallback: collapsed.length === 0,
  };
}

function createDiagnostic(reactFlowNodeId: string | null, userMessage: string): CompilerDiagnostic {
  return {
    severity: "error",
    stage: "sanitization",
    rawMessage: userMessage,
    line: null,
    reactFlowNodeId,
    socketId: null,
    userMessage,
  };
}

/**
 * Sanitize a user-provided label into a lowercase Move-safe identifier, prefixing numeric starts when needed.
 */
export function sanitizeIdentifier(input: string, fallback = "generated_identifier"): string {
  return analyseIdentifier(input, fallback).sanitized;
}

/**
 * Report blocking sanitization diagnostics for graph-derived identifiers that cannot be recovered safely.
 */
export function collectSanitizationDiagnostics(graph: IRGraph): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const moduleAnalysis = analyseIdentifier(graph.requestedModuleName, "frontier_flow");

  if (moduleAnalysis.requiredFallback) {
    diagnostics.push(
      createDiagnostic(null, "Module name must contain at least one letter, number, or underscore for Move generation."),
    );
  }

  for (const node of graph.nodes.values()) {
    const labelAnalysis = analyseIdentifier(node.label, node.type);
    if (labelAnalysis.requiredFallback) {
      diagnostics.push(
        createDiagnostic(node.id, "Node label cannot be sanitized into a valid Move identifier."),
      );
    }
  }

  return diagnostics;
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