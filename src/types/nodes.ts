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
  | "target"
  | "boolean"
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
  | "logic-gate"
  | "action";

export type NodeFieldScalar = string | number | boolean;

export type NodeFieldValue = NodeFieldScalar | readonly string[] | readonly number[] | readonly boolean[];

export type NodeFieldMap = Readonly<Record<string, NodeFieldValue>>;

/**
 * Metadata describing a node that has been replaced or retired.
 */
export interface NodeDeprecation {
  readonly status: "deprecated" | "retired";
  readonly reason: string;
  readonly replacedBy?: readonly string[];
  readonly remediationMessage?: string;
}

/**
 * User-visible restore notice for legacy content that needs follow-up.
 */
export interface RemediationNotice {
  readonly nodeId: string;
  readonly legacyType: string;
  readonly message: string;
  readonly severity: "warning" | "error";
  readonly suggestedAction: string;
}

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
  readonly deprecation?: NodeDeprecation;
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
  readonly fields: NodeFieldMap;
  readonly deprecation?: NodeDeprecation;
  readonly remediationNotice?: RemediationNotice;
  readonly diagnosticMessages?: readonly string[];
  readonly validationState?: "warning" | "error";
}

/**
 * ReactFlow node shape used by the canvas workspace.
 */
export type FlowNode = Node<FlowNodeData>;

/**
 * ReactFlow edge shape used by the canvas workspace.
 */
export type FlowEdge = Edge;