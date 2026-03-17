import type { Edge, Node } from "@xyflow/react";

/**
 * Domain-specific socket types used by Frontier Flow node handles.
 */
export type SocketType =
  | "rider"
  | "tribe"
  | "standing"
  | "wallet"
  | "priority"
  | "config"
  | "target"
  | "boolean"
  | "list"
  | "number"
  | "string"
  | "any";

/**
 * Supported handle anchor positions around a node body.
 */
export type SocketPosition = "left" | "right" | "top" | "bottom";

/**
 * Supported node socket directions.
 */
export type SocketDirection = "input" | "output";

/**
 * High-level node categories used for styling and semantics.
 */
export type NodeCategory =
  | "event-trigger"
  | "data-accessor"
  | "data-source"
  | "logic-gate"
  | "action";

/**
 * Declares a typed handle rendered on a visual node.
 */
export interface SocketDefinition {
  readonly id: string;
  readonly type: SocketType;
  readonly position: SocketPosition;
  readonly direction: SocketDirection;
  readonly label: string;
}

/**
 * Describes a draggable node type displayed in the toolbox and on the canvas.
 */
export interface NodeDefinition {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly category: NodeCategory;
  readonly sockets: readonly SocketDefinition[];
}

/**
 * Runtime data stored on each ReactFlow node instance.
 */
export interface FlowNodeData {
  readonly [key: string]: unknown;
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly category: NodeCategory;
  readonly sockets: readonly SocketDefinition[];
}

/**
 * ReactFlow node shape used by the canvas workspace.
 */
export type FlowNode = Node<FlowNodeData>;

/**
 * ReactFlow edge shape used by the canvas workspace.
 */
export type FlowEdge = Edge;