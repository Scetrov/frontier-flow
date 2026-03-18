import { describe, expect, it } from "vitest";

import { optimiseGraph } from "../../compiler/optimiser";
import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("optimiseGraph", () => {
  it("returns a report with deterministic gas estimates", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "starter_contract");

    const result = optimiseGraph(graph);

    expect(result.report.originalNodeCount).toBe(flow.nodes.length);
    expect(result.report.gasAfter).toBeLessThanOrEqual(result.report.gasBefore);
    expect(result.report.gasAfter).toBe(result.report.optimizedNodeCount * 10);
    expect(result.graph.executionOrder).toHaveLength(flow.nodes.length);
  });
});