import { describe, expect, it } from "vitest";

import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";
import { createFlowNode } from "./helpers";

describe("buildIrGraph", () => {
  it("builds nodes, connections, and a stable execution order", () => {
    const flow = createDefaultContractFlow();

    const graph = buildIrGraph(flow.nodes, flow.edges, "Starter Contract");

    expect(graph.nodes.size).toBe(flow.nodes.length);
    expect(graph.connections).toHaveLength(flow.edges.length);
    expect(graph.executionOrder[0]).toBe("default_aggression");
    expect(graph.moduleName).toBe("starter_contract");
  });

  it("tracks connected nodes that are unreachable from an event trigger", () => {
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
      "Disconnected Contract",
    );

    expect(graph.disconnectedNodeIds).toEqual(["list_1", "logic_1"]);
  });

  it("tracks nodes whose execution order cannot be resolved", () => {
    const graph = buildIrGraph(
      [createFlowNode("queue_1", "addToQueue"), createFlowNode("queue_2", "addToQueue")],
      [
        {
          id: "edge_queue_1",
          source: "queue_1",
          sourceHandle: "priority_out",
          target: "queue_2",
          targetHandle: "priority_in",
        },
        {
          id: "edge_queue_2",
          source: "queue_2",
          sourceHandle: "priority_out",
          target: "queue_1",
          targetHandle: "priority_in",
        },
      ],
      "Cyclic Contract",
    );

    expect(graph.unresolvedNodeIds).toEqual(["queue_1", "queue_2"]);
    expect(graph.executionOrder).toEqual(["queue_1", "queue_2"]);
  });
});