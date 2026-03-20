import { createFlowNodeData, getNodeDefinition } from "../../data/node-definitions";
import type { FlowNode, NodeFieldMap } from "../../types/nodes";
import { createGeneratedContractArtifact } from "../../compiler/generators/shared";
import type { DeploymentStatus, DeploymentStatusType, GeneratedContractArtifact, IRNode } from "../../compiler/types";

import type { GraphFixture } from "../../__fixtures__/graphs/smartTurretExtensionFixtures";

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

export function createFlowFromFixture(fixture: GraphFixture): {
  readonly nodes: FlowNode[];
  readonly edges: Array<{
    readonly id: string;
    readonly source: string;
    readonly sourceHandle: string;
    readonly target: string;
    readonly targetHandle: string;
  }>;
} {
  return {
    nodes: fixture.nodes.map((node) => createFlowNode(node.id, node.type, node.position)),
    edges: fixture.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
  };
}

export function createDeploymentStatus(
  status: DeploymentStatusType = "blocked",
  overrides: Partial<DeploymentStatus> = {},
): DeploymentStatus {
  return {
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    status,
    targetMode: "existing-turret",
    requiredInputs: overrides.requiredInputs ?? ["target turret package id", "extension registration target"],
    resolvedInputs: overrides.resolvedInputs ?? ["generated contract artifact"],
    blockedReasons: overrides.blockedReasons ?? ["Existing turret attachment details are not configured yet."],
    nextActionSummary: overrides.nextActionSummary ?? "Provide the target turret package and extension registration details to continue deployment.",
  };
}

export function createGeneratedArtifactStub(overrides: Partial<GeneratedContractArtifact> = {}): GeneratedContractArtifact {
  const moduleName = overrides.moduleName ?? "starter_contract";
  const artifact = createGeneratedContractArtifact({
    moduleName,
    requestedModuleName: overrides.sourceDagId ?? moduleName,
    moveToml: overrides.moveToml ?? `[package]\nname = "${moduleName}"\n`,
    moveSource: overrides.moveSource ?? `module builder_extensions::${moduleName} {}`,
    sourceMap: overrides.sourceMap ?? [],
  });

  return {
    ...artifact,
    ...overrides,
    deploymentStatus: overrides.deploymentStatus ?? createDeploymentStatus("blocked", {
      artifactId: artifact.artifactId ?? `${moduleName}-00000000`,
    }),
  };
}