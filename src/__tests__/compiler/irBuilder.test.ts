import { describe, expect, it } from "vitest";

import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("buildIrGraph", () => {
  it("builds nodes, connections, and a stable execution order", () => {
    const flow = createDefaultContractFlow();

    const graph = buildIrGraph(flow.nodes, flow.edges, "Starter Contract");

    expect(graph.nodes.size).toBe(flow.nodes.length);
    expect(graph.connections).toHaveLength(flow.edges.length);
    expect(graph.executionOrder[0]).toBe("default_aggression");
    expect(graph.moduleName).toBe("starter_contract");
  });
});