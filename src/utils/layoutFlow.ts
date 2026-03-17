import dagre from "dagre";

import type { FlowEdge, FlowNode } from "../types/nodes";

const DEFAULT_NODE_WIDTH = 288;
const DEFAULT_NODE_HEIGHT = 192;

/**
 * Produces a deterministic left-to-right dagre layout for the current flow graph.
 */
export function autoArrangeFlow(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): FlowNode[] {
  if (nodes.length === 0) {
    return [];
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    align: "UL",
    marginx: 56,
    marginy: 56,
    nodesep: 44,
    ranksep: 132,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const positionedNode = graph.node(node.id) as { x: number; y: number };

    return {
      ...node,
      position: {
        x: positionedNode.x - DEFAULT_NODE_WIDTH / 2,
        y: positionedNode.y - DEFAULT_NODE_HEIGHT / 2,
      },
    };
  });
}