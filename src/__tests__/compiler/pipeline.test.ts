import { describe, expect, it, vi } from "vitest";

import expectedDefaultTurret from "../../__fixtures__/move/default-turret.move?raw";

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
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("compilePipeline", () => {
  it("compiles the default flow into deterministic Move output", async () => {
    const flow = createDefaultContractFlow();
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "starter_contract",
    });

    expect(result.status.state).toBe("compiled");
    expect(result.code?.trim()).toBe(expectedDefaultTurret.trim());
  });
});