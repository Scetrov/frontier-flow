import { getSocketDefinition } from "../utils/socketTypes";
import type { FlowEdge, FlowNode } from "../types/nodes";

import { normalizeNodeFields } from "../data/nodeFieldCatalog";

import { createStableNodeOrder, normalizeModuleName } from "./determinism";
import type { IRConnection, IRGraph, IRNode } from "./types";

type MutableIRNode = Omit<IRNode, "inputs" | "outputs"> & {
  inputs: Record<string, IRConnection>;
  outputs: Record<string, IRConnection[]>;
};

function toIrNode(node: FlowNode): MutableIRNode {
  return {
    id: node.id,
    type: typeof node.type === "string" ? node.type : "unknown",
    label: node.data.label,
    category: node.data.category,
    fields: normalizeNodeFields(typeof node.type === "string" ? node.type : "unknown", node.data.fields),
    inputs: {},
    outputs: {},
    sockets: node.data.sockets,
  };
}

function collectDisconnectedNodeIds(nodesById: ReadonlyMap<string, MutableIRNode>): readonly string[] {
  const eventTriggerIds = Array.from(nodesById.values())
    .filter((node) => node.category === "event-trigger")
    .map((node) => node.id)
    .sort();

  if (eventTriggerIds.length === 0) {
    return [];
  }

  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodesById.keys()) {
    adjacency.set(nodeId, []);
  }

  for (const node of nodesById.values()) {
    const targets = Object.values(node.outputs)
      .flatMap((connections) => connections.map((connection) => connection.targetNodeId))
      .sort();
    adjacency.set(node.id, targets);
  }

  const reachable = new Set<string>();
  const queue = [...eventTriggerIds];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || reachable.has(current)) {
      continue;
    }

    reachable.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        queue.push(next);
      }
    }
  }

  return Array.from(nodesById.values())
    .filter((node) => {
      const hasInputSockets = node.sockets.some((socket) => socket.direction === "input");
      const isConnected = Object.keys(node.inputs).length > 0
        || Object.values(node.outputs).some((connections) => connections.length > 0);
      return hasInputSockets && isConnected && node.category !== "event-trigger" && !reachable.has(node.id);
    })
    .map((node) => node.id)
    .sort();
}

/**
 * Build the normalised intermediate representation from the React Flow canvas graph.
 */
export function buildIrGraph(nodes: readonly FlowNode[], edges: readonly FlowEdge[], moduleName: string): IRGraph {
  const flowNodesById = new Map<string, FlowNode>(nodes.map((node) => [node.id, node]));
  const nodesById = new Map<string, MutableIRNode>(nodes.map((node) => [node.id, toIrNode(node)]));
  const connections: IRConnection[] = [];

  for (const edge of edges) {
    const sourceNode = flowNodesById.get(edge.source);
    const targetNode = flowNodesById.get(edge.target);
    const sourceSocket = getSocketDefinition(sourceNode, edge.sourceHandle);
    const targetSocket = getSocketDefinition(targetNode, edge.targetHandle);

    if (sourceNode === undefined || targetNode === undefined || sourceSocket === undefined || targetSocket === undefined) {
      continue;
    }

    const connection: IRConnection = {
      sourceNodeId: edge.source,
      sourceSocketId: sourceSocket.id,
      targetNodeId: edge.target,
      targetSocketId: targetSocket.id,
      socketType: sourceSocket.type,
    };

    connections.push(connection);

    const sourceIrNode = nodesById.get(edge.source);
    const targetIrNode = nodesById.get(edge.target);
    if (sourceIrNode === undefined || targetIrNode === undefined) {
      continue;
    }

    sourceIrNode.outputs = {
      ...sourceIrNode.outputs,
      [sourceSocket.id]: [...(sourceIrNode.outputs[sourceSocket.id] ?? []), connection],
    };
    targetIrNode.inputs = {
      ...targetIrNode.inputs,
      [targetSocket.id]: connection,
    };
  }

  const stableOrder = createStableNodeOrder(nodes, edges);

  return {
    nodes: new Map<string, IRNode>(nodesById),
    connections,
    executionOrder: stableOrder.order,
    moduleName: normalizeModuleName(moduleName),
    requestedModuleName: moduleName,
    disconnectedNodeIds: collectDisconnectedNodeIds(nodesById),
    unresolvedNodeIds: stableOrder.unresolvedNodeIds,
  };
}