import { Position, type Connection } from "@xyflow/react";

import type {
  FlowEdge,
  FlowNode,
  SocketDefinition,
  SocketPosition,
  SocketType,
} from "../types/nodes";

/**
 * Compatibility matrix for Frontier Flow socket types.
 */
export const socketCompatibility: Readonly<Record<SocketType, readonly SocketType[]>> = {
  rider: ["rider", "any"],
  tribe: ["tribe", "any"],
  standing: ["standing", "number", "any"],
  wallet: ["wallet", "any"],
  priority: ["priority", "any"],
  target: ["target", "rider", "any"],
  boolean: ["boolean", "any"],
  list: ["list", "any"],
  number: ["number", "standing", "any"],
  string: ["string", "any"],
  any: [
    "rider",
    "tribe",
    "standing",
    "wallet",
    "priority",
    "target",
    "boolean",
    "list",
    "number",
    "string",
    "any",
  ],
};

const socketColorByType: Readonly<Record<SocketType, string>> = {
  rider: "var(--socket-entity)",
  tribe: "var(--socket-entity)",
  standing: "var(--socket-value)",
  wallet: "var(--socket-value)",
  priority: "var(--socket-vector)",
  target: "var(--socket-entity)",
  boolean: "var(--socket-signal)",
  list: "var(--socket-vector)",
  number: "var(--socket-value)",
  string: "var(--socket-value)",
  any: "var(--socket-any)",
};

/**
 * Returns the CSS colour used for a socket type.
 */
export function getSocketColor(socketType: SocketType): string {
  return socketColorByType[socketType];
}

/**
 * Returns true when a source socket may connect to a target socket.
 */
export function canConnectSocketTypes(sourceType: SocketType, targetType: SocketType): boolean {
  return socketCompatibility[sourceType].includes(targetType);
}

/**
 * Maps a logical socket position to a ReactFlow handle position.
 */
export function getHandlePosition(position: SocketPosition): Position {
  switch (position) {
    case "left":
      return Position.Left;
    case "right":
      return Position.Right;
    case "top":
      return Position.Top;
    case "bottom":
      return Position.Bottom;
  }
}

/**
 * Locates a socket definition by handle id on a flow node.
 */
export function getSocketDefinition(
  node: Pick<FlowNode, "data"> | undefined,
  handleId: string | null | undefined,
): SocketDefinition | undefined {
  if (node === undefined || handleId === null || handleId === undefined) {
    return undefined;
  }

  return node.data.sockets.find((socket) => socket.id === handleId);
}

/**
 * Produces the stroke colour for an edge from a source handle.
 */
export function getEdgeColor(
  sourceNode: Pick<FlowNode, "data"> | undefined,
  sourceHandleId: string | null,
): string {
  const socket = getSocketDefinition(sourceNode, sourceHandleId);
  return socket === undefined ? "var(--socket-any)" : getSocketColor(socket.type);
}

/**
 * Produces an edge width based on the source socket type.
 */
export function getEdgeStrokeWidth(
  sourceNode: Pick<FlowNode, "data"> | undefined,
  sourceHandleId: string | null,
): number {
  const socket = getSocketDefinition(sourceNode, sourceHandleId);
  return socket?.type === "priority" || socket?.type === "list" ? 3 : 2;
}

/**
 * Returns true when adding a connection would create a cycle.
 */
export function createsCycle(
  connection: Pick<Connection, "source" | "target">,
  edges: readonly FlowEdge[],
): boolean {
  if (connection.source === connection.target) {
    return true;
  }

  const visited = new Set<string>();
  const stack = [connection.target];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }

    if (current === connection.source) {
      return true;
    }

    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        stack.push(edge.target);
      }
    }
  }

  return false;
}

/**
 * Validates a proposed connection against direction, type, and cycle rules.
 */
export function isValidFlowConnection(
  connection: Connection,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): boolean {
  if (connection.sourceHandle === null || connection.targetHandle === null) {
    return false;
  }

  if (connection.source === connection.target) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);
  const sourceSocket = getSocketDefinition(sourceNode, connection.sourceHandle);
  const targetSocket = getSocketDefinition(targetNode, connection.targetHandle);

  if (sourceSocket === undefined || targetSocket === undefined) {
    return false;
  }

  if (sourceSocket.direction !== "output" || targetSocket.direction !== "input") {
    return false;
  }

  if (!canConnectSocketTypes(sourceSocket.type, targetSocket.type)) {
    return false;
  }

  return !createsCycle(connection, edges);
}