import { hydrateFlowNode } from "../data/node-definitions";
import type { FlowEdge, FlowNode } from "../types/nodes";

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
export function restoreSavedFlow(
  initialNodes: readonly FlowNode[],
  initialEdges: readonly FlowEdge[],
): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] } {
  const restoredNodes = initialNodes.flatMap((node) => {
    const restoredNode = hydrateFlowNode(node);
    if (restoredNode === undefined) {
      console.warn(`Omitting unknown saved node type: ${String(node.type)}`);
      return [];
    }

    return [restoredNode];
  });

  const restoredNodesById = new Map(restoredNodes.map((node) => [node.id, node]));
  const restoredEdges = initialEdges.filter(
    (edge) =>
      hasValidHandle(restoredNodesById.get(edge.source), edge.sourceHandle, "output") &&
      hasValidHandle(restoredNodesById.get(edge.target), edge.targetHandle, "input"),
  );

  return {
    nodes: restoredNodes,
    edges: restoredEdges,
  };
}

function hasValidHandle(
  node: FlowNode | undefined,
  handleId: string | null | undefined,
  direction: "input" | "output",
): boolean {
  if (node === undefined) {
    return false;
  }

  if (handleId == null) {
    return true;
  }

  return node.data.sockets.some((socket) => socket.id === handleId && socket.direction === direction);
}