import { describe, expect, it } from "vitest";

import { createFlowNodeData, getNodeDefinition } from "../../data/node-definitions";
import { buildIrGraph } from "../../compiler/irBuilder";
import { validateGraph } from "../../compiler/validator";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";
import { createFlowNode } from "./helpers";

import type { FlowNode } from "../../types/nodes";

function createUnsupportedFlowNode(id: string): FlowNode {
  const definition = getNodeDefinition("proximity");
  if (definition === undefined) {
    throw new Error("Expected proximity node definition to exist.");
  }

  return {
    id,
    type: "nonexistentMoveNode",
    position: { x: 0, y: 0 },
    data: {
      ...createFlowNodeData(definition),
      type: "nonexistentMoveNode",
    },
  };
}

describe("validateGraph", () => {
  it("allows the default connected flow", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "starter_contract");

    const result = validateGraph(graph);

    expect(result.valid).toBe(true);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toHaveLength(0);
  });

  it("reports missing entry point and disconnected nodes", () => {
    const graph = buildIrGraph([], [], "empty_contract");
    const result = validateGraph(graph);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.userMessage.includes("event trigger"))).toBe(true);
  });

  it("treats missing required inputs as blocking errors", () => {
    const graph = buildIrGraph([createFlowNode("queue_1", "addToQueue")], [], "invalid_contract");
    const result = validateGraph(graph);

    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.userMessage.includes("Required input 'priority in'"))).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.severity === "warning" && diagnostic.userMessage.includes("disconnected"))).toBe(true);
  });

  it("reports unsupported node types as blocking diagnostics", () => {
    const graph = buildIrGraph([createUnsupportedFlowNode("unsupported_1")], [], "unsupported_contract");

    const result = validateGraph(graph);

    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.reactFlowNodeId === "unsupported_1"
          && diagnostic.userMessage.includes("not supported for real Move generation"),
      ),
    ).toBe(true);
  });

  it("reports nodes connected outside any event-trigger entry path", () => {
    const graph = buildIrGraph(
      [
        createFlowNode("trigger_1", "aggression"),
        createFlowNode("queue_1", "addToQueue"),
        createFlowNode("list_1", "getCharacterListFromConfig"),
        createFlowNode("logic_1", "isInList"),
      ],
      [
        {
          id: "edge_trigger_queue",
          source: "trigger_1",
          sourceHandle: "priority",
          target: "queue_1",
          targetHandle: "priority_in",
        },
        {
          id: "edge_list_logic",
          source: "list_1",
          sourceHandle: "items",
          target: "logic_1",
          targetHandle: "input_list",
        },
      ],
      "disconnected_path_contract",
    );

    const result = validateGraph(graph);

    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.reactFlowNodeId === "list_1"
          && diagnostic.userMessage.includes("entry path"),
      ),
    ).toBe(true);
  });
});