import { canConnectSocketTypes } from "../utils/socketTypes";

import { getGenerator } from "./generators";
import type { CompilerDiagnostic, IRGraph, ValidationResult } from "./types";

function createDiagnostic(
  severity: "error" | "warning",
  reactFlowNodeId: string | null,
  userMessage: string,
  socketId: string | null = null,
): CompilerDiagnostic {
  return {
    severity,
    rawMessage: userMessage,
    line: null,
    reactFlowNodeId,
    socketId,
    userMessage,
  };
}

function hasCycle(graph: IRGraph): boolean {
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

  return visited !== graph.nodes.size;
}

/**
 * Validate the IR graph for structure, typing, generator coverage, and DAG safety.
 */
export function validateGraph(graph: IRGraph): ValidationResult {
  const diagnostics: CompilerDiagnostic[] = [];

  const eventTriggers = Array.from(graph.nodes.values()).filter((node) => node.category === "event-trigger");
  if (eventTriggers.length === 0) {
    diagnostics.push(createDiagnostic("error", null, "Graph requires at least one event trigger entry point."));
  }

  if (hasCycle(graph)) {
    diagnostics.push(createDiagnostic("error", null, "Graph must be acyclic before compilation."));
  }

  for (const node of graph.nodes.values()) {
    const inputSockets = node.sockets.filter((socket) => socket.direction === "input");
    const outputSockets = node.sockets.filter((socket) => socket.direction === "output");
    const isDisconnected = inputSockets.every((socket) => node.inputs[socket.id] === undefined)
      && outputSockets.every((socket) => (node.outputs[socket.id] ?? []).length === 0);

    if (isDisconnected) {
      diagnostics.push(createDiagnostic("warning", node.id, "Node is disconnected from the active graph."));
    }

    for (const socket of inputSockets) {
      if (node.inputs[socket.id] === undefined) {
        diagnostics.push(createDiagnostic("error", node.id, `Required input '${socket.label}' is not connected.`, socket.id));
      }
    }

    const generator = getGenerator(node.type);
    if (generator === undefined) {
      diagnostics.push(createDiagnostic("error", node.id, `No code generator is registered for '${node.type}'.`));
      continue;
    }

    diagnostics.push(...generator.validate(node).diagnostics);
  }

  for (const connection of graph.connections) {
    const sourceNode = graph.nodes.get(connection.sourceNodeId);
    const targetNode = graph.nodes.get(connection.targetNodeId);
    if (sourceNode === undefined || targetNode === undefined) {
      continue;
    }

    const sourceSocket = sourceNode.sockets.find((socket) => socket.id === connection.sourceSocketId);
    const targetSocket = targetNode.sockets.find((socket) => socket.id === connection.targetSocketId);
    if (sourceSocket === undefined || targetSocket === undefined) {
      continue;
    }

    if (!canConnectSocketTypes(sourceSocket.type, targetSocket.type)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          targetNode.id,
          `Socket type mismatch: '${sourceSocket.type}' cannot connect to '${targetSocket.type}'.`,
          targetSocket.id,
        ),
      );
    }
  }

  return {
    valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics,
  };
}