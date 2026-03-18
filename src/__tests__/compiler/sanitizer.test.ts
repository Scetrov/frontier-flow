import { describe, expect, it } from "vitest";

import { collectSanitizationDiagnostics, sanitizeGraph, sanitizeIdentifier } from "../../compiler/sanitizer";
import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("sanitizer", () => {
  it("normalises identifiers to Move-safe tokens", () => {
    expect(sanitizeIdentifier("  Danger Zone!! ")).toBe("danger_zone");
    expect(sanitizeIdentifier("123 bad")).toBe("id_123_bad");
  });

  it("sanitizes the graph module name", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "Starter Contract!!!");

    expect(sanitizeGraph(graph).moduleName).toBe("starter_contract");
  });

  it("reports module names that cannot become valid identifiers", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "!!!");

    const diagnostics = collectSanitizationDiagnostics(graph);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.stage).toBe("sanitization");
    expect(diagnostics[0]?.reactFlowNodeId).toBeNull();
    expect(diagnostics[0]?.userMessage).toContain("Module name");
  });

  it("reports node labels that collapse to an empty identifier", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "starter_contract");
    const aggressionNode = graph.nodes.get("default_aggression");
    if (aggressionNode === undefined) {
      throw new Error("Expected default_aggression to exist.");
    }

    const invalidGraph = {
      ...graph,
      nodes: new Map(graph.nodes).set("default_aggression", {
        ...aggressionNode,
        label: "!!!",
      }),
    };

    const diagnostics = collectSanitizationDiagnostics(invalidGraph);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.stage).toBe("sanitization");
    expect(diagnostics[0]?.reactFlowNodeId).toBe("default_aggression");
    expect(diagnostics[0]?.userMessage).toContain("Node label");
  });
});