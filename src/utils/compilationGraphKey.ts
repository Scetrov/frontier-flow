import type { FlowEdge, FlowNode, NodeFieldMap, NodeFieldValue } from "../types/nodes";

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
      .map((node) => ({
        category: node.data.category,
        fields: serializeNodeFields(node.data.fields),
        id: node.id,
        label: node.data.label,
        sockets: node.data.sockets.map((socket) => ({
          direction: socket.direction,
          id: socket.id,
          label: socket.label,
          position: socket.position,
          type: socket.type,
        })),
        type: node.type ?? null,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}