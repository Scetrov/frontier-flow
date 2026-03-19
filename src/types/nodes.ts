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
 * Primitive field value types supported by node field editors.
 */
export type EditableFieldValueType = "string" | "number" | "boolean" | "tribe" | "typeId";

/**
 * Editor rendering modes for editable node fields.
 */
export type EditableFieldEditorKind = "single-value" | "list-editor";

/**
 * Scalar values persisted by editable node fields.
 */
export type NodeFieldScalarValue = string | number | boolean;

/**
 * Persisted value for a single node field.
 */
export type NodeFieldValue = NodeFieldScalarValue | readonly NodeFieldScalarValue[];

/**
 * Validation rules used by editable node fields.
 */
export interface EditableFieldValidationRules {
  readonly allowBlank?: boolean;
  readonly allowDuplicates?: boolean;
  readonly minItems?: number;
}

/**
 * Schema definition for one editable node field.
 */
export interface EditableFieldDefinition {
  readonly id: string;
  readonly label: string;
  readonly valueType: EditableFieldValueType;
  readonly required: boolean;
  readonly defaultValue?: NodeFieldValue;
  readonly validationRules?: EditableFieldValidationRules;
  readonly editorKind: EditableFieldEditorKind;
}

/**
 * Persisted field values stored for an individual node instance.
 */
export interface NodeFieldValueSet {
  readonly values: Readonly<Record<string, NodeFieldValue>>;
  readonly lastEditedAt?: string;
}

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
  readonly fields?: readonly EditableFieldDefinition[];
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
  readonly fields?: readonly EditableFieldDefinition[];
  readonly fieldValues?: NodeFieldValueSet;
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