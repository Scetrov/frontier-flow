import type {
  EditableFieldDefinition,
  FlowNode,
  FlowNodeData,
  NodeDefinition,
  NodeFieldScalarValue,
  NodeFieldValue,
  NodeFieldValueSet,
} from "../types/nodes";

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
    type: "getTribe",
    label: "Get Tribe",
    description: "Extract the candidate tribe and the owner tribe from the target.",
    color: "var(--socket-entity)",
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
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
    category: "data-accessor",
    sockets: [
      { id: "group_id", type: "number", position: "left", direction: "input", label: "group id" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "groupBonusLookup",
    label: "Group Bonus Lookup",
    description: "Look up a group-specific bonus from the shared configuration table.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [
      { id: "group_id", type: "number", position: "left", direction: "input", label: "group id" },
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "threatBonus",
    label: "Threat Bonus",
    description: "Apply a tribe threat bonus from the shared threat ledger.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [
      { id: "tribe", type: "tribe", position: "left", direction: "input", label: "tribe" },
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
      { id: "weight_in", type: "number", position: "left", direction: "input", label: "weight in" },
      { id: "weight_out", type: "number", position: "right", direction: "output", label: "weight out" },
    ],
  },
  {
    type: "historyPenalty",
    label: "History Penalty",
    description: "Subtract weight from recently targeted candidates using round-robin history.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
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
    type: "isInList",
    label: "Is In List",
    description: "Check whether a candidate item appears in a provided list.",
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
    type: "countAggressors",
    label: "Count Aggressors",
    description: "Count aggressors in a candidate set and expose the raid threshold signal.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [
      { id: "candidates", type: "list", position: "left", direction: "input", label: "candidates" },
      { id: "count", type: "number", position: "right", direction: "output", label: "count" },
      { id: "is_raid", type: "boolean", position: "right", direction: "output", label: "is raid" },
    ],
  },
  {
    type: "groupBonusConfig",
    label: "Group Bonus Config",
    description: "Expose the group-specialist configuration object as a reusable config source.",
    color: "var(--socket-vector)",
    category: "data-source",
    sockets: [
      { id: "config", type: "config", position: "right", direction: "output", label: "config" },
    ],
  },
  {
    type: "roundRobinConfig",
    label: "Round Robin Config",
    description: "Expose the round-robin history configuration as a reusable config source.",
    color: "var(--socket-vector)",
    category: "data-source",
    sockets: [
      { id: "config", type: "config", position: "right", direction: "output", label: "config" },
    ],
  },
  {
    type: "threatLedgerConfig",
    label: "Threat Ledger Config",
    description: "Expose the tribe threat ledger as a reusable config source.",
    color: "var(--socket-vector)",
    category: "data-source",
    sockets: [
      { id: "config", type: "config", position: "right", direction: "output", label: "config" },
    ],
  },
  {
    type: "typeBlocklistConfig",
    label: "Type Blocklist Config",
    description: "Expose the blocked type id configuration as a reusable config source.",
    color: "var(--socket-vector)",
    category: "data-source",
    fields: [
      {
        id: "blockedTypeIds",
        label: "Blocked Type IDs",
        valueType: "typeId",
        required: false,
        defaultValue: [],
        validationRules: {
          allowDuplicates: false,
        },
        editorKind: "list-editor",
      },
      {
        id: "blockedTribes",
        label: "Blocked Tribes",
        valueType: "tribe",
        required: false,
        defaultValue: [],
        validationRules: {
          allowDuplicates: false,
        },
        editorKind: "list-editor",
      },
    ],
    sockets: [
      { id: "config", type: "config", position: "right", direction: "output", label: "config" },
    ],
  },
  {
    type: "getTribeListFromConfig",
    label: "Get Tribe List from Config",
    description: "Read a tribe list from a config object so it can feed reusable list-based logic.",
    color: "var(--socket-vector)",
    category: "data-accessor",
    sockets: [
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
      { id: "items", type: "list", position: "right", direction: "output", label: "tribes" },
    ],
  },
  {
    type: "getItemListFromConfig",
    label: "Get Item List from Config",
    description: "Read an item list from a config object so exclusion and scoring nodes can share it.",
    color: "var(--socket-vector)",
    category: "data-accessor",
    sockets: [
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
      { id: "items", type: "list", position: "right", direction: "output", label: "items" },
    ],
  },
  {
    type: "getCharacterListFromConfig",
    label: "Get Character List from Config",
    description: "Read a character list from a config object for allowlists, denylists, and actor-specific flows.",
    color: "var(--socket-vector)",
    category: "data-accessor",
    sockets: [
      { id: "config", type: "config", position: "left", direction: "input", label: "config" },
      { id: "items", type: "list", position: "right", direction: "output", label: "characters" },
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
      { id: "predicate", type: "boolean", position: "left", direction: "input", label: "predicate" },
      { id: "target", type: "target", position: "left", direction: "input", label: "target" },
      { id: "weight", type: "number", position: "left", direction: "input", label: "weight" },
      { id: "priority_out", type: "priority", position: "right", direction: "output", label: "priority out" },
    ],
  },
] as const;

export const authorableNodeDefinitions: readonly NodeDefinition[] = nodeDefinitions.filter(
  (definition) => definition.deprecation?.status !== "retired",
);

const nodeDefinitionsByType = new Map(nodeDefinitions.map((definition) => [definition.type, definition]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isScalarValue(value: unknown): value is NodeFieldScalarValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function matchesFieldValueType(field: EditableFieldDefinition, value: NodeFieldScalarValue): boolean {
  switch (field.valueType) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
    case "typeId":
      return typeof value === "number";
    case "string":
    case "tribe":
      return typeof value === "string";
  }
}

function normalizeFieldValue(field: EditableFieldDefinition, value: unknown): NodeFieldValue | undefined {
  if (field.editorKind === "list-editor") {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const normalizedValues = value.filter(isScalarValue).filter((entry) => matchesFieldValueType(field, entry));
    if (normalizedValues.length !== value.length) {
      return undefined;
    }

    return normalizedValues;
  }

  if (!isScalarValue(value) || !matchesFieldValueType(field, value)) {
    return undefined;
  }

  return value;
}

function createDefaultFieldValueSet(fields: readonly EditableFieldDefinition[] | undefined): NodeFieldValueSet | undefined {
  if (fields === undefined || fields.length === 0) {
    return undefined;
  }

  const values = Object.fromEntries(
    fields.flatMap((field) => (field.defaultValue === undefined ? [] : [[field.id, field.defaultValue]])),
  );

  return {
    values,
  };
}

function hydrateFieldValueSet(
  fields: readonly EditableFieldDefinition[] | undefined,
  persistedFieldValues: unknown,
): NodeFieldValueSet | undefined {
  const defaultFieldValues = createDefaultFieldValueSet(fields);
  if (fields === undefined || fields.length === 0) {
    return undefined;
  }

  if (!isRecord(persistedFieldValues) || !isRecord(persistedFieldValues.values)) {
    return defaultFieldValues;
  }

  const nextValues: Record<string, NodeFieldValue> = {
    ...(defaultFieldValues?.values ?? {}),
  };

  for (const field of fields) {
    const persistedValue = persistedFieldValues.values[field.id];
    const normalizedValue = normalizeFieldValue(field, persistedValue);
    if (normalizedValue !== undefined) {
      nextValues[field.id] = normalizedValue;
    }
  }

  return {
    values: nextValues,
    lastEditedAt: typeof persistedFieldValues.lastEditedAt === "string" ? persistedFieldValues.lastEditedAt : undefined,
  };
}

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
    fields: definition.fields,
    fieldValues: createDefaultFieldValueSet(definition.fields),
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

  const persistedFieldValues = isRecord(node.data) ? node.data.fieldValues : undefined;

  return {
    ...node,
    type: definition.type,
    data: {
      ...createFlowNodeData(definition),
      fieldValues: hydrateFieldValueSet(definition.fields, persistedFieldValues),
    },
  };
}

/**
 * Formats persisted node field values into short user-facing summary lines.
 */
export function summarizeNodeFieldValues(data: Pick<FlowNodeData, "fields" | "fieldValues">): readonly string[] {
  if (data.fields === undefined || data.fields.length === 0) {
    return [];
  }

  return data.fields.flatMap((field) => {
    const value = data.fieldValues?.values[field.id] ?? field.defaultValue;
    if (value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return [];
      }

      const preview = value.slice(0, 3).map((entry) => String(entry)).join(", ");
      const suffix = value.length > 3 ? ` +${String(value.length - 3)} more` : "";
      return [`${field.label}: ${preview}${suffix}`];
    }

    return [`${field.label}: ${String(value)}`];
  });
}