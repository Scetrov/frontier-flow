import { createFlowNodeData, getNodeDefinition } from "../../data/node-definitions";
import type { FlowNode, NodeFieldMap } from "../../types/nodes";
import { createGeneratedContractArtifact } from "../../compiler/generators/shared";
import type {
  BundledDependencySnapshot,
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
  ResolvedDependencies,
  ResolvedDependencyPackageSnapshot,
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
    confirmationReference: overrides.confirmationReference,
    outcome: overrides.outcome,
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
    artifactId: overrides.artifactId ?? "starter_contract-00000000",
    headline: overrides.headline ?? "Deployment blocked",
    targetId: overrides.targetId ?? "local",
    outcome: overrides.outcome ?? "blocked",
    severity: overrides.severity ?? "warning",
    startedAt: overrides.startedAt ?? 1,
    endedAt: overrides.endedAt ?? 2,
    stage: overrides.stage,
    packageId: overrides.packageId,
    confirmationReference: overrides.confirmationReference,
    details: overrides.details ?? "Resolve the required inputs before deploying.",
    blockedReasons: overrides.blockedReasons ?? ["Existing turret attachment details are not configured yet."],
    historicalOnly: overrides.historicalOnly,
    historicalReason: overrides.historicalReason,
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
    confirmationReference: overrides.confirmationReference,
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
    confirmationReference: overrides.confirmationReference,
    visibleInFooter: overrides.visibleInFooter ?? true,
    visibleInMovePanel: overrides.visibleInMovePanel ?? true,
  };
}

export function createPackageReferenceBundle(
  targetId: DeploymentTargetId = "testnet:stillness",
  overrides: Partial<PackageReferenceBundle> = {},
): PackageReferenceBundle {
  const bundle: PackageReferenceBundle = {
    targetId,
    environmentLabel: overrides.environmentLabel ?? (targetId === "local" ? "Localnet 0x1" : targetId === "testnet:stillness" ? "Stillness" : "Utopia"),
    worldPackageId: overrides.worldPackageId ?? "0x1",
    originalWorldPackageId: overrides.originalWorldPackageId ?? overrides.worldPackageId ?? "0x1",
    objectRegistryId: overrides.objectRegistryId ?? "0x2",
    serverAddressRegistryId: overrides.serverAddressRegistryId ?? "0x3",
    sourceVersionTag: overrides.sourceVersionTag ?? (targetId === "testnet:utopia" ? "v0.0.21" : "v0.0.18"),
    toolchainVersion: overrides.toolchainVersion ?? (targetId === "testnet:utopia" ? "1.68.0" : "1.67.1"),
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
  const artifactId = artifact.artifactId ?? `${moduleName}-00000000`;
  const deploymentStatus = overrides.deploymentStatus === undefined
    ? createDeploymentStatus("blocked", { artifactId })
    : {
        ...overrides.deploymentStatus,
        artifactId: overrides.deploymentStatus.artifactId === "starter_contract-00000000"
          ? artifactId
          : overrides.deploymentStatus.artifactId,
      };

  return {
    ...artifact,
    ...overrides,
    deploymentStatus,
  };
}

export function createResolvedDependencyPackageSnapshot(
  overrides: Partial<ResolvedDependencyPackageSnapshot> & { readonly name: string },
): ResolvedDependencyPackageSnapshot {
  const normalizedName = overrides.name.toLowerCase();
  const directoryName = normalizedName === "movestdlib"
    ? "MoveStdlib"
    : normalizedName === "sui"
      ? "Sui"
      : normalizedName === "world"
        ? "World"
        : overrides.name;

  return {
    name: overrides.name,
    files: overrides.files ?? {
      [`dependencies/${directoryName}/Move.toml`]: `[package]\nname = "${overrides.name}"\n`,
      [`dependencies/${directoryName}/sources/${normalizedName}.move`]: `module ${normalizedName}::${normalizedName} {}`,
    },
  };
}

export function createResolvedDependenciesFixture(
  packages: readonly ResolvedDependencyPackageSnapshot[] = [
    createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
    createResolvedDependencyPackageSnapshot({ name: "Sui" }),
    createResolvedDependencyPackageSnapshot({ name: "World" }),
  ],
): ResolvedDependencies {
  return {
    files: "{}",
    dependencies: JSON.stringify(packages),
    lockfileDependencies: "{}",
  };
}

export function createBundledDependencySnapshotFixture(
  overrides: Partial<BundledDependencySnapshot> = {},
): BundledDependencySnapshot {
  return {
    sourceVersionTag: overrides.sourceVersionTag ?? "v0.0.18",
    resolvedAt: overrides.resolvedAt ?? 1,
    resolvedDependencies: overrides.resolvedDependencies ?? createResolvedDependenciesFixture(),
  };
}