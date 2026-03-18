import { describe, expect, it } from "vitest";

import { sanitiseGraph, sanitiseIdentifier } from "../../compiler/sanitiser";
import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("sanitiser", () => {
  it("normalises identifiers to Move-safe tokens", () => {
    expect(sanitiseIdentifier("  Danger Zone!! ")).toBe("danger_zone");
    expect(sanitiseIdentifier("123 bad")).toBe("id_123_bad");
  });

  it("sanitises the graph module name", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "Starter Contract!!!");

    expect(sanitiseGraph(graph).moduleName).toBe("starter_contract");
  });
});