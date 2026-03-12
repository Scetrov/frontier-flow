import type { FlowNodeData, NodeDefinition } from "../types/nodes";

export const nodeDefinitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Trigger combat automations when hostile intent is detected.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [
      { id: "priority", type: "priority", position: "right", direction: "output", label: "priority" },
      { id: "aggressor", type: "rider", position: "right", direction: "output", label: "aggressor" },
      { id: "victim", type: "rider", position: "right", direction: "output", label: "victim" },
    ],
  },
  {
    type: "proximity",
    label: "Proximity",
    description: "Respond when target candidates enter the turret envelope.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [
      { id: "priority", type: "priority", position: "right", direction: "output", label: "priority" },
      { id: "target", type: "target", position: "right", direction: "output", label: "target" },
    ],
  },
  {
    type: "getTribe",
    label: "Get Tribe",
    description: "Resolve tribe, standing, and wallet data for a rider target.",
    color: "var(--socket-entity)",
    category: "data-accessor",
    sockets: [
      { id: "rider", type: "rider", position: "left", direction: "input", label: "rider" },
      { id: "tribe", type: "tribe", position: "right", direction: "output", label: "tribe" },
      { id: "standing", type: "standing", position: "right", direction: "output", label: "standing" },
      { id: "wallet", type: "wallet", position: "right", direction: "output", label: "wallet" },
    ],
  },
  {
    type: "listOfTribe",
    label: "List of Tribe",
    description: "Provide a static tribe list for the canonical targeting flow.",
    color: "var(--socket-vector)",
    category: "data-source",
    sockets: [
      { id: "items", type: "list", position: "right", direction: "output", label: "items" },
    ],
  },
  {
    type: "isInList",
    label: "Is In List",
    description: "Check whether an incoming item exists in a provided list.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "input_item", type: "any", position: "left", direction: "input", label: "input item" },
      { id: "input_list", type: "list", position: "top", direction: "input", label: "input list" },
      { id: "yes", type: "boolean", position: "right", direction: "output", label: "yes" },
      { id: "no", type: "boolean", position: "right", direction: "output", label: "no" },
    ],
  },
  {
    type: "addToQueue",
    label: "Add to Queue",
    description: "Append a selected entity to the return priority queue.",
    color: "var(--socket-vector)",
    category: "action",
    sockets: [
      { id: "priority_in", type: "priority", position: "left", direction: "input", label: "priority in" },
      { id: "predicate", type: "boolean", position: "left", direction: "input", label: "predicate" },
      { id: "entity", type: "any", position: "left", direction: "input", label: "entity" },
      { id: "priority_out", type: "priority", position: "right", direction: "output", label: "priority out" },
    ],
  },
  {
    type: "hpRatio",
    label: "HP Ratio",
    description: "Read the target hull ratio as a numeric value.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "hp_ratio", type: "number", position: "right", direction: "output", label: "hp ratio" },
    ],
  },
  {
    type: "shieldRatio",
    label: "Shield Ratio",
    description: "Read the target shield ratio as a numeric value.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "shield_ratio", type: "number", position: "right", direction: "output", label: "shield ratio" },
    ],
  },
  {
    type: "armorRatio",
    label: "Armor Ratio",
    description: "Read the target armor ratio as a numeric value.",
    color: "var(--socket-signal)",
    category: "data-accessor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "armor_ratio", type: "number", position: "right", direction: "output", label: "armor ratio" },
    ],
  },
] as const;

const nodeDefinitionsByType = new Map(nodeDefinitions.map((definition) => [definition.type, definition]));

/**
 * Looks up a node definition by its ReactFlow type key.
 */
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeDefinitionsByType.get(type);
}

/**
 * Converts a static node definition into runtime ReactFlow node data.
 */
export function createFlowNodeData(definition: NodeDefinition): FlowNodeData {
  return {
    type: definition.type,
    label: definition.label,
    description: definition.description,
    color: definition.color,
    category: definition.category,
    sockets: definition.sockets,
  };
}