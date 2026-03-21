import { createFlowNodeData, getNodeDefinition } from "../../data/node-definitions";
import type { FlowNode, NodeFieldMap } from "../../types/nodes";
import { createGeneratedContractArtifact } from "../../compiler/generators/shared";
import type {
  DeploymentAttempt,
  DeploymentProgress,
  DeploymentReviewEntry,
  DeploymentStatus,
  DeploymentStatusMessage,
  DeploymentStatusType,
  DeploymentTargetId,
  GeneratedContractArtifact,
  IRNode,
  PackageReferenceBundle,
} from "../../compiler/types";

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
    targetId: overrides.targetId ?? "local",
    packageId: overrides.packageId,
    stage: overrides.stage,
    severity: overrides.severity,
    headline: overrides.headline ?? "Deployment blocked",
    targetMode: "existing-turret",
    requiredInputs: overrides.requiredInputs ?? ["target turret package id", "extension registration target"],
    resolvedInputs: overrides.resolvedInputs ?? ["generated contract artifact"],
    blockedReasons: overrides.blockedReasons ?? ["Existing turret attachment details are not configured yet."],
    nextActionSummary: overrides.nextActionSummary ?? "Provide the target turret package and extension registration details to continue deployment.",
    reviewHistory: overrides.reviewHistory ?? [],
  };
}

export function createDeploymentReviewEntry(
  overrides: Partial<DeploymentReviewEntry> = {},
): DeploymentReviewEntry {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    headline: overrides.headline ?? "Deployment blocked",
    targetId: overrides.targetId ?? "local",
    severity: overrides.severity ?? "warning",
    stage: overrides.stage,
    packageId: overrides.packageId,
    details: overrides.details ?? "Resolve the required inputs before deploying.",
    blockedReasons: overrides.blockedReasons ?? ["Existing turret attachment details are not configured yet."],
  };
}

export function createDeploymentAttempt(
  overrides: Partial<DeploymentAttempt> = {},
): DeploymentAttempt {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    targetId: overrides.targetId ?? "local",
    startedAt: overrides.startedAt ?? 1,
    endedAt: overrides.endedAt,
    outcome: overrides.outcome ?? "blocked",
    currentStage: overrides.currentStage ?? "validating",
    packageId: overrides.packageId,
    message: overrides.message ?? "Deployment is waiting for required inputs.",
    errorCode: overrides.errorCode,
  };
}

export function createDeploymentProgress(
  overrides: Partial<DeploymentProgress> = {},
): DeploymentProgress {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    targetId: overrides.targetId ?? "local",
    stage: overrides.stage ?? "validating",
    stageIndex: overrides.stageIndex ?? 0,
    stageCount: overrides.stageCount ?? 5,
    completedStages: overrides.completedStages ?? [],
    activeMessage: overrides.activeMessage ?? "Validating deployment prerequisites.",
    dismissedByUser: overrides.dismissedByUser ?? false,
  };
}

export function createDeploymentStatusMessage(
  overrides: Partial<DeploymentStatusMessage> = {},
): DeploymentStatusMessage {
  return {
    attemptId: overrides.attemptId ?? "attempt-0001",
    targetId: overrides.targetId ?? "local",
    severity: overrides.severity ?? "warning",
    headline: overrides.headline ?? "Deployment blocked",
    details: overrides.details ?? "Resolve the required inputs before deploying.",
    stage: overrides.stage,
    packageId: overrides.packageId,
    visibleInFooter: overrides.visibleInFooter ?? true,
    visibleInMovePanel: overrides.visibleInMovePanel ?? true,
  };
}

export function createPackageReferenceBundle(
  targetId: Exclude<DeploymentTargetId, "local"> = "testnet:stillness",
  overrides: Partial<PackageReferenceBundle> = {},
): PackageReferenceBundle {
  const bundle: PackageReferenceBundle = {
    targetId,
    environmentLabel: overrides.environmentLabel ?? (targetId === "testnet:stillness" ? "Stillness" : "Utopia"),
    worldPackageId: overrides.worldPackageId ?? "0x1",
    objectRegistryId: overrides.objectRegistryId ?? "0x2",
    serverAddressRegistryId: overrides.serverAddressRegistryId ?? "0x3",
    source: overrides.source ?? "test",
    lastVerifiedOn: overrides.lastVerifiedOn ?? "2026-03-21",
  };

  return bundle;
}

export function createGeneratedArtifactStub(overrides: Partial<GeneratedContractArtifact> = {}): GeneratedContractArtifact {
  const moduleName = overrides.moduleName ?? "starter_contract";
  const artifact: GeneratedContractArtifact = createGeneratedContractArtifact({
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