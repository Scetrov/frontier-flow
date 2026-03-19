import { render } from "@testing-library/react";
import { createElement } from "react";

import CanvasWorkspace from "../components/CanvasWorkspace";
import { createFlowNodeData } from "../data/node-definitions";
import type { FlowEdge, FlowNode, NodeCategory } from "../types/nodes";

export function createTestFlowNode(
  id: string,
  type: string,
  options?: {
    readonly category?: NodeCategory;
    readonly label?: string;
    readonly description?: string;
    readonly color?: string;
    readonly height?: number;
    readonly position?: { readonly x: number; readonly y: number };
    readonly selected?: boolean;
    readonly width?: number;
  },
): FlowNode {
  return {
    height: options?.height,
    id,
    type,
    position: options?.position ?? { x: 0, y: 0 },
    selected: options?.selected,
    width: options?.width,
    data: createFlowNodeData({
      type,
      label: options?.label ?? type,
      description: options?.description ?? `${type} test node`,
      color: options?.color ?? "var(--socket-any)",
      category: options?.category ?? "action",
      sockets: [],
    }),
  };
}

export function createTestFlowEdge(
  id: string,
  source: string,
  target: string,
  options?: {
    readonly sourceHandle?: string;
    readonly targetHandle?: string;
    readonly selected?: boolean;
  },
): FlowEdge {
  return {
    id,
    source,
    target,
    sourceHandle: options?.sourceHandle,
    targetHandle: options?.targetHandle,
    selected: options?.selected,
  };
}

export function renderPreviewCanvas(options?: {
  readonly initialContractName?: string;
  readonly initialNodes?: readonly FlowNode[];
  readonly initialEdges?: readonly FlowEdge[];
}) {
  return render(
    createElement(CanvasWorkspace, {
      initialContractName: options?.initialContractName ?? "Preview Contract",
      initialEdges: options?.initialEdges ?? [],
      initialNodes: options?.initialNodes ?? [],
      mode: "preview",
    }),
  );
}