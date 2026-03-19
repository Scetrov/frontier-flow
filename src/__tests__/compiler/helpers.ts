import { createFlowNodeData, getNodeDefinition } from "../../data/node-definitions";
import type { FlowNode, NodeFieldMap } from "../../types/nodes";
import type { IRNode } from "../../compiler/types";

export function createFlowNode(id: string, type: string, position = { x: 0, y: 0 }, fields?: NodeFieldMap): FlowNode {
  const definition = getNodeDefinition(type);
  if (definition === undefined) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id,
    type,
    position,
    data: {
      ...createFlowNodeData(definition),
      fields: fields ?? createFlowNodeData(definition).fields,
    },
  };
}

export function createIrNode(id: string, type: string, fields: NodeFieldMap = {}): IRNode {
  const definition = getNodeDefinition(type);
  if (definition === undefined) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id,
    type,
    label: definition.label,
    category: definition.category,
    fields,
    inputs: {},
    outputs: {},
    sockets: definition.sockets,
  };
}