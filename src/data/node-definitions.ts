import type { FlowNode, FlowNodeData, NodeDefinition } from "../types/nodes";

import { getDefaultNodeFields, normalizeNodeFields } from "./nodeFieldCatalog";

export const nodeDefinitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Emit priority and target data when a hostile action is detected.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [
      { id: "priority", type: "priority", position: "right", direction: "output", label: "priority" },
      { id: "target", type: "target", position: "right", direction: "output", label: "target" },
    ],
  },
  {
    type: "proximity",
    label: "Proximity",
    description: "Emit priority and target data when a candidate enters turret range.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [
      { id: "priority", type: "priority", position: "right", direction: "output", label: "priority" },
      { id: "target", type: "target", position: "right", direction: "output", label: "target" },
    ],
  },
  {
    type: "listTribe",
    label: "List of Tribe",
    description: "Curate a reusable tribe list for downstream target matching.",
    color: "var(--socket-entity)",
    category: "static-data",
    sockets: [{ id: "list", type: "any", position: "right", direction: "output", label: "list" }],
  },
  {
    type: "listShip",
    label: "List of Ship",
    description: "Curate a reusable ship list for downstream target matching.",
    color: "var(--socket-value)",
    category: "static-data",
    sockets: [{ id: "list", type: "any", position: "right", direction: "output", label: "list" }],
  },
  {
    type: "listCharacter",
    label: "List of Character",
    description: "Curate a reusable list of character addresses for explicit target matching.",
    color: "var(--socket-any)",
    category: "static-data",
    sockets: [{ id: "list", type: "any", position: "right", direction: "output", label: "list" }],
  },
  {
    type: "getTribe",
    label: "Get Tribe",
    description: "Extract the candidate tribe and the owner tribe from the target.",
    color: "var(--socket-entity)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "tribe", type: "tribe", position: "right", direction: "output", label: "tribe" },
      { id: "owner_tribe", type: "tribe", position: "right", direction: "output", label: "owner tribe" },
    ],
  },
  {
    type: "hpRatio",
    label: "HP Ratio",
    description: "Read the candidate hull integrity ratio.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "hp_ratio", type: "number", position: "right", direction: "output", label: "hp ratio" },
    ],
  },
  {
    type: "shieldRatio",
    label: "Shield Ratio",
    description: "Read the candidate shield integrity ratio.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "shield_ratio", type: "number", position: "right", direction: "output", label: "shield ratio" },
    ],
  },
  {
    type: "armorRatio",
    label: "Armor Ratio",
    description: "Read the candidate armor integrity ratio.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "armor_ratio", type: "number", position: "right", direction: "output", label: "armor ratio" },
    ],
  },
  {
    type: "getGroupId",
    label: "Get Group ID",
    description: "Extract the target group identifier used by size and specialist rules.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "group_id", type: "number", position: "right", direction: "output", label: "group id" },
    ],
  },
  {
    type: "getBehaviour",
    label: "Get Behaviour",
    description: "Read the candidate behaviour change code for scoring and exclusion.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "behaviour", type: "number", position: "right", direction: "output", label: "behaviour" },
    ],
  },
  {
    type: "isAggressor",
    label: "Is Aggressor",
    description: "Emit whether the current target is marked as an aggressor.",
    color: "var(--socket-signal)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "is_aggressor", type: "boolean", position: "right", direction: "output", label: "is aggressor" },
    ],
  },
  {
    type: "getPriorityWeight",
    label: "Get Priority Weight",
    description: "Read the base priority weight that contract scoring starts from.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "weight", type: "number", position: "right", direction: "output", label: "weight" },
    ],
  },
  {
    type: "behaviourBonus",
    label: "Behaviour Bonus",
    description: "Apply the contract behaviour bonus to a running target weight.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "behaviour", type: "number", position: "left", direction: "input", label: "behaviour" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "aggressorBonus",
    label: "Aggressor Bonus",
    description: "Add the aggressor bonus when the target is currently attacking.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "is_aggressor", type: "boolean", position: "left", direction: "input", label: "is aggressor" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "damageBonus",
    label: "Damage Bonus",
    description: "Apply damage-based scoring using hull, shield, and armor ratios.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "hp_ratio", type: "number", position: "left", direction: "input", label: "hp ratio" },
      { id: "shield_ratio", type: "number", position: "left", direction: "input", label: "shield ratio" },
      { id: "armor_ratio", type: "number", position: "left", direction: "input", label: "armor ratio" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "sizeTierBonus",
    label: "Size Tier Bonus",
    description: "Convert a group id into a size-tier bonus on the running weight.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [
      { id: "group_id", type: "number", position: "left", direction: "input", label: "group id" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "excludeOwner",
    label: "Exclude Owner",
    description: "Block the turret owner from being included as a target.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    deprecation: {
      status: "retired",
      reason: "Use Is Owner plus NOT for explicit boolean composition.",
      replacedBy: ["isOwner", "booleanNot"],
      remediationMessage: "Replace Exclude Owner with Is Owner feeding a NOT node.",
    },
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "include", type: "boolean", position: "right", direction: "output", label: "include" },
    ],
  },
  {
    type: "excludeSameTribe",
    label: "Exclude Same Tribe",
    description: "Reject same-tribe candidates unless they are active aggressors.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    deprecation: {
      status: "retired",
      reason: "Use Is Same Tribe with NOT and OR for explicit boolean composition.",
      replacedBy: ["isSameTribe", "booleanNot", "booleanOr"],
      remediationMessage: "Replace Exclude Same Tribe with Is Same Tribe feeding NOT, then combine with Is Aggressor via OR.",
    },
    sockets: [
      { id: "tribe", type: "tribe", position: "left", direction: "input", label: "tribe" },
      { id: "owner_tribe", type: "tribe", position: "left", direction: "input", label: "owner tribe" },
      { id: "is_aggressor", type: "boolean", position: "left", direction: "input", label: "is aggressor" },
      { id: "include", type: "boolean", position: "right", direction: "output", label: "include" },
    ],
  },
  {
    type: "excludeStoppedAttack",
    label: "Exclude Stopped Attack",
    description: "Reject candidates whose latest behaviour indicates they stopped attacking.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    deprecation: {
      status: "retired",
      reason: "Use Has Stopped Attack plus NOT for explicit boolean composition.",
      replacedBy: ["hasStoppedAttack", "booleanNot"],
      remediationMessage: "Replace Exclude Stopped Attack with Has Stopped Attack feeding a NOT node.",
    },
    sockets: [
      { id: "behaviour", type: "number", position: "left", direction: "input", label: "behaviour" },
      { id: "include", type: "boolean", position: "right", direction: "output", label: "include" },
    ],
  },
  {
    type: "excludeNpc",
    label: "Exclude NPC",
    description: "Reject non-player candidates based on the contract target identity rules.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    deprecation: {
      status: "retired",
      reason: "Use Is NPC plus NOT for explicit boolean composition.",
      replacedBy: ["isNpc", "booleanNot"],
      remediationMessage: "Replace Exclude NPC with Is NPC feeding a NOT node.",
    },
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "include", type: "boolean", position: "right", direction: "output", label: "include" },
    ],
  },
  {
    type: "isInList",
    label: "Is in List",
    description: "Match the current turret target against a configured tribe, ship, or character list.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "list", type: "any", position: "left", direction: "input", label: "list" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "isInGroup",
    label: "Is in Group",
    description: "Match the current turret target against selected ship groups.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "isOwner",
    label: "Is Owner",
    description: "Emit whether the candidate target is the turret owner.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "isSameTribe",
    label: "Is Same Tribe",
    description: "Emit whether the candidate tribe matches the owner tribe.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "tribe", type: "tribe", position: "left", direction: "input", label: "tribe" },
      { id: "owner_tribe", type: "tribe", position: "left", direction: "input", label: "owner tribe" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "hasStoppedAttack",
    label: "Has Stopped Attack",
    description: "Emit whether the latest behaviour indicates the target stopped attacking.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "behaviour", type: "number", position: "left", direction: "input", label: "behaviour" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "isNpc",
    label: "Is NPC",
    description: "Emit whether the candidate target resolves to a non-player entity.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "matches", type: "boolean", position: "right", direction: "output", label: "matches" },
    ],
  },
  {
    type: "booleanNot",
    label: "NOT",
    description: "Invert a boolean input for explicit rule composition.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "input", type: "boolean", position: "left", direction: "input", label: "input" },
      { id: "result", type: "boolean", position: "right", direction: "output", label: "result" },
    ],
  },
  {
    type: "booleanAnd",
    label: "AND",
    description: "Combine two boolean inputs and emit true only when both are true.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "left", type: "boolean", position: "left", direction: "input", label: "left" },
      { id: "right", type: "boolean", position: "left", direction: "input", label: "right" },
      { id: "result", type: "boolean", position: "right", direction: "output", label: "result" },
    ],
  },
  {
    type: "booleanOr",
    label: "OR",
    description: "Combine two boolean inputs and emit true when either input is true.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "left", type: "boolean", position: "left", direction: "input", label: "left" },
      { id: "right", type: "boolean", position: "left", direction: "input", label: "right" },
      { id: "result", type: "boolean", position: "right", direction: "output", label: "result" },
    ],
  },
  {
    type: "booleanXor",
    label: "XOR",
    description: "Combine two boolean inputs and emit true only when the inputs differ.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "left", type: "boolean", position: "left", direction: "input", label: "left" },
      { id: "right", type: "boolean", position: "left", direction: "input", label: "right" },
      { id: "result", type: "boolean", position: "right", direction: "output", label: "result" },
    ],
  },
  {
    type: "addToQueue",
    label: "Add to Queue",
    description: "Append an included, weighted target to the outgoing priority queue.",
    color: "var(--socket-vector)",
    category: "action",
    sockets: [
      { id: "priority_in", type: "priority", position: "left", direction: "input", label: "priority in" },
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "predicate", type: "boolean", position: "left", direction: "input", label: "predicate" },
      { id: "weight", type: "number", position: "left", direction: "input", label: "weight" },
      { id: "priority_out", type: "priority", position: "right", direction: "output", label: "priority out" },
    ],
  },
] as const;

export const authorableNodeDefinitions: readonly NodeDefinition[] = nodeDefinitions.filter(
  (definition) => definition.deprecation?.status !== "retired",
);

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
    fields: getDefaultNodeFields(definition.type),
    deprecation: definition.deprecation,
  };
}

/**
 * Rehydrates a saved flow node from the canonical node definition catalogue.
 */
export function hydrateFlowNode(node: FlowNode): FlowNode | undefined {
  if (typeof node.type !== "string") {
    return undefined;
  }

  const definition = getNodeDefinition(node.type);
  if (definition === undefined) {
    return undefined;
  }

  const persistedData = node.data as { readonly fields?: unknown } | undefined;

  return {
    ...node,
    type: definition.type,
    data: {
      ...createFlowNodeData(definition),
      fields: normalizeNodeFields(definition.type, persistedData?.fields),
    },
  };
}