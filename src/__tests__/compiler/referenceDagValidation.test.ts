import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../compiler/moveCompiler", () => ({
  compileMove: vi.fn().mockResolvedValue({
    success: true,
    modules: [new Uint8Array([1, 2, 3])],
    dependencies: [],
    errors: null,
    warnings: [],
  }),
}));

import { compilePipeline } from "../../compiler/pipeline";
import { compileMove } from "../../compiler/moveCompiler";

import { createFlowFromFixture } from "./helpers";
import {
  createReferenceFingerprint,
  expectSupportedReferenceArtifact,
  expectUnsupportedReferenceFailure,
} from "./referenceArtifactAssertions";
import { supportedReferenceDagCases, unsupportedReferenceDagCases } from "./referenceDagFixtures";

describe("reference DAG validation", () => {
  beforeEach(() => {
    vi.mocked(compileMove).mockClear();
  });

  it.each(supportedReferenceDagCases)("compiles supported reference DAG $id into a deterministic artifact", async (referenceCase) => {
    const flow = createFlowFromFixture(referenceCase.fixture);
    const [firstResult, secondResult] = await Promise.all([
      compilePipeline({ nodes: flow.nodes, edges: flow.edges, moduleName: referenceCase.fixture.moduleName }),
      compilePipeline({ nodes: flow.nodes, edges: flow.edges, moduleName: referenceCase.fixture.moduleName }),
    ]);

    expect(firstResult.status.state).toBe("compiled");
    expect(secondResult.status.state).toBe("compiled");

    const firstArtifact = expectSupportedReferenceArtifact(firstResult.artifact, referenceCase);
    const secondArtifact = expectSupportedReferenceArtifact(secondResult.artifact, referenceCase);

    expect(createReferenceFingerprint(firstArtifact)).toBe(createReferenceFingerprint(secondArtifact));
    expect(firstArtifact.traceSections).toEqual(secondArtifact.traceSections);
  });

  it("captures a stable supported-inventory artifact id snapshot", async () => {
    const artifactIds: Record<string, string | undefined> = {};

    for (const referenceCase of supportedReferenceDagCases) {
      const flow = createFlowFromFixture(referenceCase.fixture);
      const result = await compilePipeline({
        nodes: flow.nodes,
        edges: flow.edges,
        moduleName: referenceCase.fixture.moduleName,
      });

      const artifact = expectSupportedReferenceArtifact(result.artifact, referenceCase);
      artifactIds[referenceCase.id] = artifact.artifactId;
    }

    expect(artifactIds).toMatchInlineSnapshot(`
      {
        "turret_aggressor_first": "turret_aggressor_first-4dd59a22",
        "turret_low_hp_finisher": "turret_low_hp_finisher-e62c97dc",
        "turret_player_screen": "turret_player_screen-32fd6177",
        "turret_size_priority": "turret_size_priority-d8082d1a",
      }
    `);
  });

  it.each(unsupportedReferenceDagCases)("blocks unsupported reference DAG $id before compilation", async (referenceCase) => {
    const flow = createFlowFromFixture(referenceCase.fixture);
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: referenceCase.fixture.moduleName,
    });

    expectUnsupportedReferenceFailure(result, referenceCase);
    expect(vi.mocked(compileMove)).not.toHaveBeenCalled();
  });
});