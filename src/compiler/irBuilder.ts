import { getSocketDefinition } from "../utils/socketTypes";
import type { FlowEdge, FlowNode } from "../types/nodes";

import { normalizeNodeFields } from "../data/nodeFieldCatalog";

import type { IRConnection, IRGraph, IRNode } from "./types";

type MutableIRNode = Omit<IRNode, "inputs" | "outputs"> & {
  inputs: Record<string, IRConnection>;
  outputs: Record<string, IRConnection[]>;
};

interface StableOrderResult {
  readonly order: readonly string[];
  readonly unresolvedNodeIds: readonly string[];
}

function normaliseModuleName(input: string): string {
  const collapsed = input
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const value = collapsed.length > 0 ? collapsed : "frontier_flow";
  return /^[A-Za-z_]/.test(value) ? value.toLowerCase() : `module_${value.toLowerCase()}`;
}

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

function createStableOrder(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): StableOrderResult {
  const sortedIds = nodes.map((node) => node.id).sort();
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

  const queue = sortedIds.filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0);
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

  if (order.length === sortedIds.length) {
    return {
      order,
      unresolvedNodeIds: [],
    };
  }

  const remaining = sortedIds.filter((nodeId) => !order.includes(nodeId));
  return {
    order: order.concat(remaining),
    unresolvedNodeIds: remaining,
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

  const stableOrder = createStableOrder(nodes, edges);

  return {
    nodes: new Map<string, IRNode>(nodesById),
    connections,
    executionOrder: stableOrder.order,
    moduleName: normaliseModuleName(moduleName),
    requestedModuleName: moduleName,
    disconnectedNodeIds: collectDisconnectedNodeIds(nodesById),
    unresolvedNodeIds: stableOrder.unresolvedNodeIds,
  };
}