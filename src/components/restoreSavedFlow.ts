import { hydrateFlowNode } from "../data/node-definitions";
import { getLegacyNodeMigrationRule, migrateLegacyNode } from "../data/nodeMigration";
import type { CompilerDiagnostic } from "../compiler/types";
import type { FlowEdge, FlowNode, RemediationNotice } from "../types/nodes";
import { deriveFlowEdgePresentation } from "../utils/socketTypes";

/**
 * Convert remediation notices from flow restoration into compiler diagnostics
 * so they surface in the footer's compilation status panel (FR-013, FR-018).
 */
export function remediationNoticesToDiagnostics(notices: readonly RemediationNotice[]): readonly CompilerDiagnostic[] {
  return notices.map((notice) => ({
    severity: notice.severity === "error" ? "error" as const : "warning" as const,
    stage: "validation" as const,
    rawMessage: notice.message,
    line: null,
    reactFlowNodeId: notice.nodeId,
    socketId: null,
    userMessage: `${notice.message} ${notice.suggestedAction}`,
  }));
}

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
export function restoreSavedFlow(
  initialNodes: readonly FlowNode[],
  initialEdges: readonly FlowEdge[],
): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[]; readonly remediationNotices: RemediationNotice[] } {
  const incomingEdgesByNodeId = new Map<string, FlowEdge[]>();
  const outgoingEdgesByNodeId = new Map<string, FlowEdge[]>();

  for (const edge of initialEdges) {
    const incomingEdges = incomingEdgesByNodeId.get(edge.target) ?? [];
    incomingEdges.push(edge);
    incomingEdgesByNodeId.set(edge.target, incomingEdges);

    const outgoingEdges = outgoingEdgesByNodeId.get(edge.source) ?? [];
    outgoingEdges.push(edge);
    outgoingEdgesByNodeId.set(edge.source, outgoingEdges);
  }

  const remediationNotices: RemediationNotice[] = [];
  const migratedEdges: FlowEdge[] = [];

  const restoredNodes = initialNodes.flatMap((node) => {
    const legacyType = typeof node.type === "string" ? node.type : undefined;
    const migrationRule = legacyType === undefined ? undefined : getLegacyNodeMigrationRule(legacyType);
    if (migrationRule?.autoMigrate === true) {
      const migration = migrateLegacyNode({
        node,
        incomingEdges: incomingEdgesByNodeId.get(node.id) ?? [],
        outgoingEdges: outgoingEdgesByNodeId.get(node.id) ?? [],
      });
      remediationNotices.push(...migration.remediationNotices);
      migratedEdges.push(...migration.edges);
      return [...migration.nodes];
    }

    const restoredNode = hydrateFlowNode(node);
    if (restoredNode === undefined) {
      console.warn(`Omitting unknown saved node type: ${String(node.type)}`);

      const migration = migrateLegacyNode({
        node,
        incomingEdges: incomingEdgesByNodeId.get(node.id) ?? [],
        outgoingEdges: outgoingEdgesByNodeId.get(node.id) ?? [],
      });
      remediationNotices.push(...migration.remediationNotices);
      migratedEdges.push(...migration.edges);

      return [...migration.nodes];
    }

    return [restoredNode];
  });

  const restoredNodesById = new Map(restoredNodes.map((node) => [node.id, node]));
  const restoredEdges = [...initialEdges, ...migratedEdges]
    .filter((edge) => {
      const sourceNode = restoredNodesById.get(edge.source);
      const targetNode = restoredNodesById.get(edge.target);
      const sourceHandleValid = hasValidHandle(sourceNode, edge.sourceHandle, "output");
      const targetHandleValid = hasValidHandle(targetNode, edge.targetHandle, "input");

      if (sourceHandleValid && targetHandleValid) {
        return true;
      }

      if (sourceNode !== undefined && targetNode !== undefined) {
        remediationNotices.push(createDroppedEdgeRemediationNotice({
          edge,
          sourceHandleValid,
          sourceNode,
          targetHandleValid,
          targetNode,
        }));
      }

      return false;
    })
    .map((edge) => ({
      ...edge,
      ...deriveFlowEdgePresentation(edge, restoredNodesById),
    }));

  return {
    nodes: restoredNodes,
    edges: restoredEdges,
    remediationNotices,
  };
}

function createDroppedEdgeRemediationNotice(input: {
  readonly edge: FlowEdge;
  readonly sourceHandleValid: boolean;
  readonly sourceNode: FlowNode | undefined;
  readonly targetHandleValid: boolean;
  readonly targetNode: FlowNode | undefined;
}): RemediationNotice {
  const { edge, sourceHandleValid, sourceNode, targetHandleValid, targetNode } = input;
  const sourceType = typeof sourceNode?.type === "string" ? sourceNode.type : "unknown";
  const invalidHandleDescriptions = getInvalidHandleDescriptions({
    edge,
    sourceHandleValid,
    sourceType,
    targetHandleValid,
    targetType: typeof targetNode?.type === "string" ? targetNode.type : "unknown",
  });

  return {
    nodeId: sourceNode?.id ?? targetNode?.id ?? edge.source,
    legacyType: sourceType,
    severity: "warning",
    message: `Dropped saved edge "${edge.id}" because ${invalidHandleDescriptions.join(" and ")} no longer exists.`,
    suggestedAction: "Reconnect this path with the current node handles and verify the restored graph before saving again.",
  };
}

function getInvalidHandleDescriptions(input: {
  readonly edge: FlowEdge;
  readonly sourceHandleValid: boolean;
  readonly sourceType: string;
  readonly targetHandleValid: boolean;
  readonly targetType: string;
}): string[] {
  return [
    describeInvalidHandle(input.sourceHandleValid, input.edge.sourceHandle, input.sourceType, "source"),
    describeInvalidHandle(input.targetHandleValid, input.edge.targetHandle, input.targetType, "target"),
  ].filter((description): description is string => description !== null);
}

function describeInvalidHandle(
  handleValid: boolean,
  handleId: string | null | undefined,
  nodeType: string,
  position: "source" | "target",
): string | null {
  if (handleValid) {
    return null;
  }

  return `${position} handle "${handleId ?? "(default)"}" on ${nodeType}`;
}

function hasValidHandle(
  node: FlowNode | undefined,
  handleId: string | null | undefined,
  direction: "input" | "output",
): boolean {
  if (node === undefined) {
    return false;
  }

  if (handleId == null) {
    return true;
  }

  return node.data.sockets.some((socket) => socket.id === handleId && socket.direction === direction);
}