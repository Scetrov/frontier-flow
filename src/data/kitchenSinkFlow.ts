import { authorableNodeDefinitions, createFlowNodeData, nodeDefinitions } from "./node-definitions";

import type { FlowEdge, FlowNode } from "../types/nodes";
import { autoArrangeFlow } from "../utils/layoutFlow";
import { getEdgeColor, getEdgeStrokeWidth } from "../utils/socketTypes";

const GRID_COLUMNS = 4;
const GRID_START_X = 96;
const GRID_START_Y = 128;
const GRID_COLUMN_GAP = 360;
const GRID_ROW_GAP = 264;

const DEFAULT_FLOW_NODES: ReadonlyArray<{
  readonly id: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly y: number };
}> = [
  { id: "default_aggression", type: "aggression", position: { x: 0, y: 0 } },
  { id: "default_get_tribe", type: "getTribe", position: { x: 0, y: 0 } },
  { id: "default_is_aggressor", type: "isAggressor", position: { x: 0, y: 0 } },
  { id: "default_is_same_tribe", type: "isSameTribe", position: { x: 0, y: 0 } },
  { id: "default_not_same_tribe", type: "booleanNot", position: { x: 0, y: 0 } },
  { id: "default_include_rule", type: "booleanOr", position: { x: 0, y: 0 } },
  { id: "default_get_priority_weight", type: "getPriorityWeight", position: { x: 0, y: 0 } },
  { id: "default_add_to_queue", type: "addToQueue", position: { x: 0, y: 0 } },
] as const;

const DEFAULT_FLOW_CONNECTIONS: ReadonlyArray<{
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
}> = [
  {
    id: "default_edge_aggression_target_get_tribe",
    source: "default_aggression",
    sourceHandle: "target",
    target: "default_get_tribe",
    targetHandle: "target",
  },
  {
    id: "default_edge_aggression_target_is_aggressor",
    source: "default_aggression",
    sourceHandle: "target",
    target: "default_is_aggressor",
    targetHandle: "target",
  },
  {
    id: "default_edge_get_tribe_tribe_is_same_tribe",
    source: "default_get_tribe",
    sourceHandle: "tribe",
    target: "default_is_same_tribe",
    targetHandle: "tribe",
  },
  {
    id: "default_edge_get_tribe_owner_tribe_is_same_tribe",
    source: "default_get_tribe",
    sourceHandle: "owner_tribe",
    target: "default_is_same_tribe",
    targetHandle: "owner_tribe",
  },
  {
    id: "default_edge_is_same_tribe_not",
    source: "default_is_same_tribe",
    sourceHandle: "matches",
    target: "default_not_same_tribe",
    targetHandle: "input",
  },
  {
    id: "default_edge_not_same_tribe_or_left",
    source: "default_not_same_tribe",
    sourceHandle: "result",
    target: "default_include_rule",
    targetHandle: "left",
  },
  {
    id: "default_edge_is_aggressor_or_right",
    source: "default_is_aggressor",
    sourceHandle: "is_aggressor",
    target: "default_include_rule",
    targetHandle: "right",
  },
  {
    id: "default_edge_aggression_target_get_priority_weight",
    source: "default_aggression",
    sourceHandle: "target",
    target: "default_get_priority_weight",
    targetHandle: "target",
  },
  {
    id: "default_edge_aggression_priority_add_to_queue",
    source: "default_aggression",
    sourceHandle: "priority",
    target: "default_add_to_queue",
    targetHandle: "priority_in",
  },
  {
    id: "default_edge_aggression_target_add_to_queue",
    source: "default_aggression",
    sourceHandle: "target",
    target: "default_add_to_queue",
    targetHandle: "target",
  },
  {
    id: "default_edge_include_rule_add_to_queue",
    source: "default_include_rule",
    sourceHandle: "result",
    target: "default_add_to_queue",
    targetHandle: "predicate",
  },
  {
    id: "default_edge_get_priority_weight_weight_add_to_queue",
    source: "default_get_priority_weight",
    sourceHandle: "weight",
    target: "default_add_to_queue",
    targetHandle: "weight",
  },
] as const;

function createFlowNode(id: string, type: string, position: { readonly x: number; readonly y: number }): FlowNode {
  const definition = nodeDefinitions.find((candidate) => candidate.type === type);
  if (definition === undefined) {
    throw new Error(`Unknown node type for flow fixture: ${type}`);
  }

  return {
    id,
    type,
    position,
    data: createFlowNodeData(definition),
  };
}

function createStyledFlowEdge(
  nodesById: ReadonlyMap<string, FlowNode>,
  connection: (typeof DEFAULT_FLOW_CONNECTIONS)[number],
): FlowEdge {
  const sourceNode = nodesById.get(connection.source);

  return {
    ...connection,
    animated: true,
    style: {
      stroke: getEdgeColor(sourceNode, connection.sourceHandle),
      strokeWidth: getEdgeStrokeWidth(sourceNode, connection.sourceHandle),
    },
  };
}

/**
 * Creates the default starter contract shown on the main editor route.
 */
export function createDefaultContractFlow(): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] } {
  const nodes = autoArrangeFlow(
    DEFAULT_FLOW_NODES.map((node) => createFlowNode(node.id, node.type, node.position)),
    DEFAULT_FLOW_CONNECTIONS.map((connection) => ({
      id: connection.id,
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
    })),
  );
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = DEFAULT_FLOW_CONNECTIONS.map((connection) => createStyledFlowEdge(nodesById, connection));

  return { nodes, edges };
}

/**
 * Creates a deterministic preview layout containing every available node definition.
 */
export function createKitchenSinkNodes(): FlowNode[] {
  return authorableNodeDefinitions.map((definition, index) => {
    const column = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);

    return createFlowNode(`kitchen-sink_${definition.type}`, definition.type, {
      x: GRID_START_X + column * GRID_COLUMN_GAP,
      y: GRID_START_Y + row * GRID_ROW_GAP,
    });
  });
}