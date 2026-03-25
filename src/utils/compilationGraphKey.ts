import type { FlowEdge, FlowNode, NodeFieldMap, NodeFieldValue, SocketDefinition } from "../types/nodes";

function compareNullableStrings(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  return left.localeCompare(right);
}

function serializeNodeFields(fields: NodeFieldMap): Array<readonly [string, NodeFieldValue]> {
  return Object.entries(fields)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([fieldKey, fieldValue]) => [fieldKey, fieldValue] as const);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSocketDefinition(value: unknown): value is SocketDefinition {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string"
    && typeof value.type === "string"
    && typeof value.position === "string"
    && typeof value.direction === "string"
    && typeof value.label === "string";
}

function getNodeFields(nodeData: Record<string, unknown>): NodeFieldMap {
  const fields = nodeData.fields;
  return isRecord(fields) ? fields as NodeFieldMap : {};
}

function getNodeSockets(nodeData: Record<string, unknown>): readonly SocketDefinition[] {
  const sockets = nodeData.sockets;
  return Array.isArray(sockets) ? sockets.filter(isSocketDefinition) : [];
}

function getSerializableNode(node: FlowNode) {
  const nodeData = isRecord(node.data) ? node.data : {};
  const fields = getNodeFields(nodeData);
  const sockets = getNodeSockets(nodeData);

  return {
    fields: serializeNodeFields(fields),
    id: node.id,
    sockets: sockets.map((socket) => ({
      direction: socket.direction,
      id: socket.id,
      label: socket.label,
      position: socket.position,
      type: socket.type,
    })),
    type: node.type ?? null,
  };
}

/**
 * Creates a deterministic fingerprint for the current canvas graph and requested module name.
 */
export function createCompilationGraphKey(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
): string {
  return JSON.stringify({
    edges: edges
      .map((edge) => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? null,
        target: edge.target,
        targetHandle: edge.targetHandle ?? null,
      }))
      .sort((left, right) => {
        const sourceCompare = left.source.localeCompare(right.source);
        if (sourceCompare !== 0) {
          return sourceCompare;
        }

        const targetCompare = left.target.localeCompare(right.target);
        if (targetCompare !== 0) {
          return targetCompare;
        }

        const sourceHandleCompare = compareNullableStrings(left.sourceHandle, right.sourceHandle);
        if (sourceHandleCompare !== 0) {
          return sourceHandleCompare;
        }

        return compareNullableStrings(left.targetHandle, right.targetHandle);
      }),
    moduleName,
    nodes: nodes
      .map((node) => getSerializableNode(node))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}