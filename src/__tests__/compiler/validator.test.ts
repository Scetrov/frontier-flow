import { describe, expect, it } from "vitest";

import { buildIrGraph } from "../../compiler/irBuilder";
import { validateGraph } from "../../compiler/validator";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";
import { createFlowNode } from "./helpers";

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
});