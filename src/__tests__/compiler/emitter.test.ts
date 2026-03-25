import { describe, expect, it } from "vitest";

import { emitMove, prepareArtifactManifestForTarget } from "../../compiler/emitter";
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
    expect(emitted.moveToml).toContain('world = { local = "deps/world" }');
    expect(emitted.artifact.sourceFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "deps/world/Move.toml" }),
        expect.objectContaining({ path: "deps/world/sources/character.move" }),
        expect.objectContaining({ path: "deps/world/sources/in_game_id.move" }),
        expect.objectContaining({ path: "deps/world/sources/turret.move" }),
      ]),
    );
  });

  it("includes only published package dependencies for remote manifests", () => {
    const manifest = prepareArtifactManifestForTarget("starter_contract", "testnet:stillness", ["0xexisting"]);

    expect(manifest.dependencies).toEqual([
      "0xexisting",
      "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
    ]);
  });
});