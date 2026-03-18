import { describe, expect, it } from "vitest";

import { emitMove } from "../../compiler/emitter";
import { buildIrGraph } from "../../compiler/irBuilder";
import { sanitiseGraph } from "../../compiler/sanitiser";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("emitMove", () => {
  it("emits deterministic Move code with source map entries", () => {
    const flow = createDefaultContractFlow();
    const graph = sanitiseGraph(buildIrGraph(flow.nodes, flow.edges, "starter_contract"));

    const emitted = emitMove(graph);

    expect(emitted.code).toContain("module builder_extensions::starter_contract");
    expect(emitted.code).toContain("public fun execute()");
    expect(emitted.sourceMap.length).toBeGreaterThan(0);
    expect(emitted.moveToml).toContain('name = "starter_contract"');
  });
});