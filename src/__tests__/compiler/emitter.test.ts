import { describe, expect, it } from "vitest";

import { emitMove } from "../../compiler/emitter";
import { buildIrGraph } from "../../compiler/irBuilder";
import { sanitizeGraph } from "../../compiler/sanitizer";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";
import expectedDefaultTurret from "../../__fixtures__/move/default-turret.move?raw";
import expectedMinimalArtifact from "../../__fixtures__/move/graph-to-move-minimal.move?raw";

import { createFlowNode } from "./helpers";

describe("emitMove", () => {
  it("emits the expected default-flow Move artifact", () => {
    const flow = createDefaultContractFlow();
    const graph = sanitizeGraph(buildIrGraph(flow.nodes, flow.edges, "starter_contract"));

    const emitted = emitMove(graph);

    expect(emitted.code.trim()).toBe(expectedDefaultTurret.trim());
    expect(emitted.artifact.moveSource).toBe(emitted.code);
    expect(emitted.artifact.sourceFilePath).toBe("sources/starter_contract.move");
    expect(emitted.sourceMap.map((entry) => entry.line)).toEqual([...emitted.sourceMap.map((entry) => entry.line)].sort((left, right) => left - right));
  });

  it("emits the expected minimal proximity artifact", () => {
    const graph = sanitizeGraph(
      buildIrGraph([createFlowNode("minimal_proximity", "proximity")], [], "graph_to_move_minimal"),
    );

    const emitted = emitMove(graph);

    expect(emitted.code.trim()).toBe(expectedMinimalArtifact.trim());
    expect(emitted.moveToml).toContain('name = "graph_to_move_minimal"');
  });
});