import { canConnectSocketTypes } from "../utils/socketTypes";

import { getGenerator } from "./generators";
import type { CompilerDiagnostic, IRGraph, IRNode, ValidationResult } from "./types";

const OPTIONAL_INPUT_SOCKETS = new Map<string, ReadonlySet<string>>([
  ["addToQueue", new Set(["predicate", "target", "weight"])],
]);

interface GraphTopology {
  readonly adjacency: Map<string, string[]>;
  readonly indegree: Map<string, number>;
}

function createDiagnostic(
  severity: "error" | "warning",
  reactFlowNodeId: string | null,
  userMessage: string,
  socketId: string | null = null,
): CompilerDiagnostic {
  return {
    severity,
    stage: "validation",
    rawMessage: userMessage,
    line: null,
    reactFlowNodeId,
    socketId,
    userMessage,
  };
}

function hasCycle(graph: IRGraph): boolean {
  const { adjacency, indegree } = createGraphTopology(graph);
  return hasCycleInTopology(adjacency, indegree, graph.nodes.size);
}

function createGraphTopology(graph: IRGraph): GraphTopology {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const nodeId of graph.nodes.keys()) {
    indegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }

  for (const connection of graph.connections) {
    adjacency.get(connection.sourceNodeId)?.push(connection.targetNodeId);
    indegree.set(connection.targetNodeId, (indegree.get(connection.targetNodeId) ?? 0) + 1);
  }

  return { adjacency, indegree };
}

function hasCycleInTopology(adjacency: GraphTopology["adjacency"], indegree: GraphTopology["indegree"], nodeCount: number): boolean {
  const queue = Array.from(indegree.entries())
    .filter(([, degree]) => degree === 0)
    .map(([nodeId]) => nodeId);
  let visited = 0;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    visited += 1;
    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }

  return visited !== nodeCount;
}

function collectGraphDiagnostics(graph: IRGraph): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const eventTriggers = Array.from(graph.nodes.values()).filter((node) => node.category === "event-trigger");

  if (eventTriggers.length === 0) {
    diagnostics.push(createDiagnostic("error", null, "Graph requires at least one event trigger entry point."));
  }

  if (hasCycle(graph)) {
    diagnostics.push(createDiagnostic("error", null, "Graph must be acyclic before compilation."));
  }

  diagnostics.push(...graph.unresolvedNodeIds.map((nodeId) =>
    createDiagnostic(
      "error",
      nodeId,
      "Execution order cannot be resolved for this graph path. Remove the dependency loop and try again.",
    )));
  diagnostics.push(...graph.disconnectedNodeIds.map((nodeId) =>
    createDiagnostic(
      "error",
      nodeId,
      "Node is connected outside any event-trigger entry path and cannot become part of the generated contract.",
    )));

  return diagnostics;
}

function collectNodeDiagnostics(node: IRNode, graph: IRGraph): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const inputSockets = node.sockets.filter((socket) => socket.direction === "input");
  const outputSockets = node.sockets.filter((socket) => socket.direction === "output");
  const optionalInputs = OPTIONAL_INPUT_SOCKETS.get(node.type) ?? new Set<string>();

  if (isNodeDisconnected(node, inputSockets, outputSockets)) {
    diagnostics.push(createDiagnostic("warning", node.id, "Node is disconnected from the active graph."));
  }

  diagnostics.push(...collectMissingInputDiagnostics(node, inputSockets, optionalInputs));

  const generator = getGenerator(node.type);
  if (generator === undefined) {
    diagnostics.push(createDiagnostic("error", node.id, `Node type '${node.type}' is not supported for real Move generation.`));
    return diagnostics;
  }

  diagnostics.push(...generator.validate(node, graph).diagnostics);
  return diagnostics;
}

function isNodeDisconnected(node: IRNode, inputSockets: readonly { readonly id: string }[], outputSockets: readonly { readonly id: string }[]): boolean {
  return inputSockets.every((socket) => node.inputs[socket.id] === undefined)
    && outputSockets.every((socket) => (node.outputs[socket.id] ?? []).length === 0);
}

function collectMissingInputDiagnostics(
  node: IRNode,
  inputSockets: readonly { readonly id: string; readonly label: string }[],
  optionalInputs: ReadonlySet<string>,
): CompilerDiagnostic[] {
  return inputSockets
    .filter((socket) => !optionalInputs.has(socket.id) && node.inputs[socket.id] === undefined)
    .map((socket) => createDiagnostic("error", node.id, `Required input '${socket.label}' is not connected.`, socket.id));
}

function collectConnectionDiagnostics(graph: IRGraph): CompilerDiagnostic[] {
  return graph.connections.flatMap((connection) => {
    const sourceNode = graph.nodes.get(connection.sourceNodeId);
    const targetNode = graph.nodes.get(connection.targetNodeId);
    if (sourceNode === undefined || targetNode === undefined) {
      return [];
    }

    const sourceSocket = sourceNode.sockets.find((socket) => socket.id === connection.sourceSocketId);
    const targetSocket = targetNode.sockets.find((socket) => socket.id === connection.targetSocketId);
    if (sourceSocket === undefined || targetSocket === undefined) {
      return [];
    }

    return canConnectSocketTypes(sourceSocket.type, targetSocket.type)
      ? []
      : [
          createDiagnostic(
            "error",
            targetNode.id,
            `Socket type mismatch: '${sourceSocket.type}' cannot connect to '${targetSocket.type}'.`,
            targetSocket.id,
          ),
        ];
  });
}

/**
 * Validate the IR graph for structure, typing, generator coverage, and DAG safety.
 */
export function validateGraph(graph: IRGraph): ValidationResult {
  const diagnostics = [
    ...collectGraphDiagnostics(graph),
    ...Array.from(graph.nodes.values()).flatMap((node) => collectNodeDiagnostics(node, graph)),
    ...collectConnectionDiagnostics(graph),
  ];

  return {
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
  };
}