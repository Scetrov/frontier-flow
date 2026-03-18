import { describe, expect, it } from "vitest";

import { sanitizeGraph, sanitizeIdentifier } from "../../compiler/sanitizer";
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
});