import { describe, expect, it } from "vitest";

import { createStableNodeOrder } from "../../compiler/determinism";
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
        createFlowNode("weight_1", "getPriorityWeight"),
        createFlowNode("bonus_1", "damageBonus"),
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
          id: "edge_weight_bonus",
          source: "weight_1",
          sourceHandle: "weight",
          target: "bonus_1",
          targetHandle: "weight_in",
        },
      ],
      "Disconnected Contract",
    );

    expect(graph.disconnectedNodeIds).toHaveLength(2);
    expect(graph.disconnectedNodeIds).toEqual(expect.arrayContaining(["weight_1", "bonus_1"]));
  });

  it("keeps source-only data nodes out of disconnected trigger diagnostics", () => {
    const graph = buildIrGraph(
      [
        createFlowNode("trigger_1", "aggression"),
        createFlowNode("list_1", "listCharacter"),
        createFlowNode("list_gate_1", "isInList"),
      ],
      [
        {
          id: "edge_trigger_list_gate_target",
          source: "trigger_1",
          sourceHandle: "target",
          target: "list_gate_1",
          targetHandle: "target",
        },
        {
          id: "edge_list_source",
          source: "list_1",
          sourceHandle: "list",
          target: "list_gate_1",
          targetHandle: "list",
        },
      ],
      "source_nodes_contract",
    );

    expect(graph.disconnectedNodeIds).not.toContain("list_1");
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

  it("uses the deterministic helper to produce the same canonical order on repeated runs", () => {
    const flow = createDefaultContractFlow();

    const firstOrder = createStableNodeOrder(flow.nodes, flow.edges);
    const secondOrder = createStableNodeOrder(flow.nodes, flow.edges);

    expect(firstOrder).toEqual(secondOrder);
  });
});