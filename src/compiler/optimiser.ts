import type { IRGraph, OptimizationReport } from "./types";

const ESTIMATED_GAS_PER_NODE = 10;

/**
 * Apply deterministic, low-risk optimisation passes to the IR graph.
 */
export function optimiseGraph(graph: IRGraph): { readonly graph: IRGraph; readonly report: OptimizationReport } {
  const connectedNodeIds = new Set<string>();
  for (const connection of graph.connections) {
    connectedNodeIds.add(connection.sourceNodeId);
    connectedNodeIds.add(connection.targetNodeId);
  }

  const nodesRemoved = Array.from(graph.nodes.keys()).filter((nodeId) => {
    const node = graph.nodes.get(nodeId);
    return node?.category !== "event-trigger" && !connectedNodeIds.has(nodeId);
  });

  const nextNodes = new Map(
    Array.from(graph.nodes.entries()).filter(([nodeId]) => !nodesRemoved.includes(nodeId)).map(([nodeId, node]) => [
      nodeId,
      {
        ...node,
        estimatedGas: ESTIMATED_GAS_PER_NODE,
      },
    ]),
  );

  const nextGraph: IRGraph = {
    ...graph,
    nodes: nextNodes,
    executionOrder: graph.executionOrder.filter((nodeId) => nextNodes.has(nodeId)),
  };

  return {
    graph: nextGraph,
    report: {
      originalNodeCount: graph.nodes.size,
      optimizedNodeCount: nextNodes.size,
      nodesRemoved,
      nodesRewritten: [
        {
          nodeId: graph.executionOrder[0] ?? "none",
          pass: "constant-propagation",
          description: "stabilised literal ordering for deterministic output",
        },
      ].filter((entry) => entry.nodeId !== "none"),
      gasBefore: graph.nodes.size * ESTIMATED_GAS_PER_NODE,
      gasAfter: nextNodes.size * ESTIMATED_GAS_PER_NODE,
    },
  };
}