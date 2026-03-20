import { createFlowNodeData, getNodeDefinition } from "./node-definitions";

import type { FlowEdge, FlowNode, RemediationNotice } from "../types/nodes";

export interface LegacyNodeMigrationMappingRule {
  readonly sourceHandle: string;
  readonly targetNodeType: string;
  readonly targetHandle: string;
}

export interface LegacyNodeMigrationRule {
  readonly legacyType: string;
  readonly replacementTypes: readonly string[];
  readonly autoMigrate: boolean;
  readonly mappingRules: readonly LegacyNodeMigrationMappingRule[];
  readonly remediationMessage: string;
}

export interface LegacyNodeMigrationCandidate {
  readonly node: FlowNode;
  readonly incomingEdges: readonly FlowEdge[];
  readonly outgoingEdges: readonly FlowEdge[];
}

export interface LegacyNodeMigrationResult {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly remediationNotices: readonly RemediationNotice[];
}

export const legacyNodeMigrationRules: readonly LegacyNodeMigrationRule[] = [
  {
    legacyType: "excludeOwner",
    replacementTypes: ["isOwner", "booleanNot"],
    autoMigrate: true,
    mappingRules: [],
    remediationMessage: "Replace Exclude Owner with Is Owner feeding NOT.",
  },
  {
    legacyType: "excludeSameTribe",
    replacementTypes: ["isSameTribe", "booleanNot", "booleanOr"],
    autoMigrate: true,
    mappingRules: [],
    remediationMessage: "Replace Exclude Same Tribe with Is Same Tribe feeding NOT, then combine with Is Aggressor via OR.",
  },
  {
    legacyType: "excludeStoppedAttack",
    replacementTypes: ["hasStoppedAttack", "booleanNot"],
    autoMigrate: true,
    mappingRules: [],
    remediationMessage: "Replace Exclude Stopped Attack with Has Stopped Attack feeding NOT.",
  },
  {
    legacyType: "excludeNpc",
    replacementTypes: ["isNpc", "booleanNot"],
    autoMigrate: true,
    mappingRules: [],
    remediationMessage: "Replace Exclude NPC with Is NPC feeding NOT.",
  },
];

const legacyNodeMigrationRulesByType = new Map(legacyNodeMigrationRules.map((rule) => [rule.legacyType, rule]));

export function getLegacyNodeMigrationRule(legacyType: string): LegacyNodeMigrationRule | undefined {
  return legacyNodeMigrationRulesByType.get(legacyType);
}

export function migrateLegacyNode(candidate: LegacyNodeMigrationCandidate): LegacyNodeMigrationResult {
  const legacyType = typeof candidate.node.type === "string" ? candidate.node.type : "unknown";
  const rule = getLegacyNodeMigrationRule(legacyType);
  if (rule !== undefined && rule.autoMigrate) {
    const migratedResult = autoMigrateLegacyNode(candidate);
    if (migratedResult !== undefined) {
      return migratedResult;
    }

    return {
      nodes: [],
      edges: [],
      remediationNotices: [
        {
          nodeId: candidate.node.id,
          legacyType,
          message: `Legacy node "${legacyType}" has a declared migration rule, but the primitive replacement path is not implemented yet.`,
          severity: "warning",
          suggestedAction: `Replace ${legacyType} with ${rule.replacementTypes.join(", ")} before saving the graph again.`,
        },
      ],
    };
  }

  return {
    nodes: [],
    edges: [],
    remediationNotices: [
      {
        nodeId: candidate.node.id,
        legacyType,
        message: `Legacy node "${legacyType}" could not be restored automatically.`,
        severity: "warning",
        suggestedAction: "Recreate this rule with the current node catalogue and verify any dependent connections before saving.",
      },
    ],
  };
}

function autoMigrateLegacyNode(candidate: LegacyNodeMigrationCandidate): LegacyNodeMigrationResult | undefined {
  switch (candidate.node.type) {
    case "excludeOwner":
      return migratePredicateWithNot(candidate, "isOwner");
    case "excludeStoppedAttack":
      return migratePredicateWithNot(candidate, "hasStoppedAttack");
    case "excludeNpc":
      return migratePredicateWithNot(candidate, "isNpc");
    case "excludeSameTribe":
      return migrateExcludeSameTribe(candidate);
    default:
      return undefined;
  }
}

function createMigrationNode(id: string, type: string, position: FlowNode["position"]): FlowNode {
  const definition = getNodeDefinition(type);
  if (definition === undefined) {
    throw new Error(`Unknown migration target node type: ${type}`);
  }

  return {
    id,
    type,
    position,
    data: createFlowNodeData(definition),
  };
}

interface MigrationEdgeInput {
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
}

function createMigrationEdge({ id, source, sourceHandle, target, targetHandle }: MigrationEdgeInput): FlowEdge {
  return {
    id,
    source,
    sourceHandle,
    target,
    targetHandle,
    animated: true,
  };
}

function migratePredicateWithNot(
  candidate: LegacyNodeMigrationCandidate,
  predicateType: "isOwner" | "hasStoppedAttack" | "isNpc",
): LegacyNodeMigrationResult {
  const predicateNode = createMigrationNode(
    `${candidate.node.id}__predicate`,
    predicateType,
    { x: candidate.node.position.x - 120, y: candidate.node.position.y },
  );
  const notNode = createMigrationNode(
    `${candidate.node.id}__not`,
    "booleanNot",
    { x: candidate.node.position.x + 120, y: candidate.node.position.y },
  );

  const incomingEdges = candidate.incomingEdges.map((edge) => ({
    ...edge,
    target: predicateNode.id,
  }));
  const outgoingEdges = candidate.outgoingEdges.map((edge) => ({
    ...edge,
    source: notNode.id,
    sourceHandle: "result",
  }));

  return {
    nodes: [predicateNode, notNode],
    edges: [
      ...incomingEdges,
      createMigrationEdge({
        id: `${candidate.node.id}__predicate_to_not`,
        source: predicateNode.id,
        sourceHandle: "matches",
        target: notNode.id,
        targetHandle: "input",
      }),
      ...outgoingEdges,
    ],
    remediationNotices: [],
  };
}

function migrateExcludeSameTribe(candidate: LegacyNodeMigrationCandidate): LegacyNodeMigrationResult {
  const sameTribeNode = createMigrationNode(
    `${candidate.node.id}__same_tribe`,
    "isSameTribe",
    { x: candidate.node.position.x - 200, y: candidate.node.position.y - 40 },
  );
  const notNode = createMigrationNode(
    `${candidate.node.id}__not_same_tribe`,
    "booleanNot",
    { x: candidate.node.position.x, y: candidate.node.position.y - 20 },
  );
  const orNode = createMigrationNode(
    `${candidate.node.id}__include_rule`,
    "booleanOr",
    { x: candidate.node.position.x + 220, y: candidate.node.position.y },
  );

  const incomingEdges: FlowEdge[] = [];
  for (const edge of candidate.incomingEdges) {
    if (edge.targetHandle === "tribe" || edge.targetHandle === "owner_tribe") {
      incomingEdges.push({
        ...edge,
        target: sameTribeNode.id,
      });
      continue;
    }

    if (edge.targetHandle === "is_aggressor") {
      incomingEdges.push({
        ...edge,
        target: orNode.id,
        targetHandle: "right",
      });
    }
  }

  const outgoingEdges = candidate.outgoingEdges.map((edge) => ({
    ...edge,
    source: orNode.id,
    sourceHandle: "result",
  }));

  return {
    nodes: [sameTribeNode, notNode, orNode],
    edges: [
      ...incomingEdges,
      createMigrationEdge({
        id: `${candidate.node.id}__same_tribe_to_not`,
        source: sameTribeNode.id,
        sourceHandle: "matches",
        target: notNode.id,
        targetHandle: "input",
      }),
      createMigrationEdge({
        id: `${candidate.node.id}__not_to_or`,
        source: notNode.id,
        sourceHandle: "result",
        target: orNode.id,
        targetHandle: "left",
      }),
      ...outgoingEdges,
    ],
    remediationNotices: [],
  };
}