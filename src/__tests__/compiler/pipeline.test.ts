import { beforeEach, describe, expect, it, vi } from "vitest";

import expectedDefaultTurret from "../../__fixtures__/move/default-turret.move?raw";
import expectedSupportedArtifact from "../../__fixtures__/move/graph-to-move-supported.move?raw";
import expectedScoringArtifact from "../../__fixtures__/move/graph-to-move-scoring.move?raw";
import supportedGraphText from "../../__fixtures__/graphs/graph-to-move-supported.json?raw";
import scoringGraphText from "../../__fixtures__/graphs/graph-to-move-scoring.json?raw";
import { compileableSmartTurretExtensions, type GraphFixture } from "../../__fixtures__/graphs/smartTurretExtensionFixtures";
import { createArtifactFingerprint } from "../../compiler/determinism";

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
import { createFlowNode } from "./helpers";

import type { FlowEdge, FlowNode } from "../../types/nodes";
import { compileMove } from "../../compiler/moveCompiler";

function stripNodeAnnotations(code: string): string {
  return code.replace(/\s+\/\/ @ff-node:[A-Za-z0-9_-]+$/gm, "");
}

function createFlowFromFixture(fixture: GraphFixture): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] } {
  return {
    nodes: fixture.nodes.map((node) => createFlowNode(node.id, node.type, node.position)),
    edges: fixture.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
  };
}

const supportedGraphFixture = JSON.parse(supportedGraphText) as GraphFixture;
const scoringGraphFixture = JSON.parse(scoringGraphText) as GraphFixture;

const referenceGraphCases = [
  {
    name: "supported action chain",
    fixture: supportedGraphFixture,
    expectedMove: expectedSupportedArtifact,
  },
  {
    name: "scoring modifier chain",
    fixture: scoringGraphFixture,
    expectedMove: expectedScoringArtifact,
  },
] as const;

describe("compilePipeline", () => {
  beforeEach(() => {
    vi.mocked(compileMove).mockClear();
  });

  it("compiles the default flow into deterministic Move output", async () => {
    const flow = createDefaultContractFlow();
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "starter_contract",
    });

    expect(result.status.state).toBe("compiled");
    expect(stripNodeAnnotations(result.code ?? "").trim()).toBe(expectedDefaultTurret.trim());
  });

  it.each(referenceGraphCases)("compiles the $name reference graph into the expected artifact", async ({ fixture, expectedMove }) => {
    const flow = createFlowFromFixture(fixture);
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: fixture.moduleName,
    });

    expect(result.status.state).toBe("compiled");
    expect(stripNodeAnnotations(result.code ?? "").trim()).toBe(expectedMove.trim());
    expect(stripNodeAnnotations(result.artifact?.moveSource ?? "").trim()).toBe(expectedMove.trim());
    expect(result.artifact?.sourceFilePath).toBe(`sources/${fixture.moduleName}.move`);
  });

  it.each(compileableSmartTurretExtensions)("compiles the $extensionId extension-aligned fixture", async ({ fixture }) => {
    const flow = createFlowFromFixture(fixture);
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: fixture.moduleName,
    });

    expect(result.status.state).toBe("compiled");
    expect(result.artifact?.sourceFilePath).toBe(`sources/${fixture.moduleName}.move`);
    expect(result.artifact?.moveSource).toContain(`module builder_extensions::${fixture.moduleName}`);
  });

  it("keeps repeated pipeline runs byte-identical for the same graph", async () => {
    const flow = createDefaultContractFlow();
    const [firstResult, secondResult] = await Promise.all([
      compilePipeline({ nodes: flow.nodes, edges: flow.edges, moduleName: "starter_contract" }),
      compilePipeline({ nodes: flow.nodes, edges: flow.edges, moduleName: "starter_contract" }),
    ]);

    expect(firstResult.code).toBe(secondResult.code);
    expect(firstResult.sourceMap).toEqual(secondResult.sourceMap);
    expect(firstResult.artifact).toEqual(secondResult.artifact);
    expect(
      createArtifactFingerprint({
        artifactId: firstResult.artifact?.artifactId,
        moduleName: firstResult.artifact?.moduleName ?? "starter_contract",
        sourceFilePath: firstResult.artifact?.sourceFilePath ?? "sources/starter_contract.move",
        moveToml: firstResult.artifact?.moveToml ?? "",
        moveSource: firstResult.artifact?.moveSource ?? "",
        dependencies: firstResult.artifact?.dependencies ?? [],
      }),
    ).toBe(
      createArtifactFingerprint({
        artifactId: secondResult.artifact?.artifactId,
        moduleName: secondResult.artifact?.moduleName ?? "starter_contract",
        sourceFilePath: secondResult.artifact?.sourceFilePath ?? "sources/starter_contract.move",
        moveToml: secondResult.artifact?.moveToml ?? "",
        moveSource: secondResult.artifact?.moveSource ?? "",
        dependencies: secondResult.artifact?.dependencies ?? [],
      }),
    );
  });

  it("stops before emission and compile when sanitization fails", async () => {
    const flow = createDefaultContractFlow();
    const compileMoveMock = vi.mocked(compileMove);
    compileMoveMock.mockClear();

    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "!!!",
    });

    expect(result.status.state).toBe("error");
    expect(result.artifact).toBeNull();
    expect(result.code).toBeNull();
    expect(result.diagnostics.some((diagnostic) => diagnostic.stage === "sanitization")).toBe(true);
    expect(compileMoveMock).not.toHaveBeenCalled();
  });

  it("surfaces artifact-linked compiler failures from the generated package", async () => {
    vi.mocked(compileMove).mockResolvedValueOnce({
      success: false,
      modules: null,
      dependencies: null,
      errors: [
        {
          severity: "error",
          stage: "compilation",
          rawMessage: "error[E03001]: unresolved symbol at sources/starter_contract.move:10:9",
          line: 10,
          reactFlowNodeId: "default_add_to_queue",
          socketId: null,
          userMessage: "unresolved symbol at sources/starter_contract.move:10:9",
        },
      ],
      warnings: [],
      artifact: {
        moduleName: "starter_contract",
        sourceFilePath: "sources/starter_contract.move",
        moveToml: "[package]\nname = \"starter_contract\"\n",
        moveSource: "module builder_extensions::starter_contract {}",
        sourceMap: [],
        dependencies: [],
        bytecodeModules: [],
      },
    });

    const flow = createDefaultContractFlow();
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "starter_contract",
    });

    expect(result.status.state).toBe("error");
    expect(result.artifact?.sourceFilePath).toBe("sources/starter_contract.move");
    expect(result.diagnostics[0]?.stage).toBe("compilation");
    expect(result.diagnostics[0]?.reactFlowNodeId).toBe("default_add_to_queue");
    expect(vi.mocked(compileMove)).toHaveBeenCalledTimes(1);
  });

  it("propagates compiler warnings while still returning a compiled artifact", async () => {
    vi.mocked(compileMove).mockResolvedValueOnce({
      success: true,
      modules: [new Uint8Array([7, 8, 9])],
      dependencies: [],
      errors: null,
      warnings: [
        {
          severity: "warning",
          stage: "compilation",
          rawMessage: "warning: unused binding at sources/starter_contract.move:8:9",
          line: 8,
          reactFlowNodeId: "default_aggression",
          socketId: null,
          userMessage: "unused binding at sources/starter_contract.move:8:9",
        },
      ],
      artifact: {
        moduleName: "starter_contract",
        sourceFilePath: "sources/starter_contract.move",
        moveToml: "[package]\nname = \"starter_contract\"\n",
        moveSource: "module builder_extensions::starter_contract {}",
        sourceMap: [],
        dependencies: [],
        bytecodeModules: [new Uint8Array([7, 8, 9])],
      },
    });

    const flow = createDefaultContractFlow();
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "starter_contract",
    });

    expect(result.status.state).toBe("compiled");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        reactFlowNodeId: "default_aggression",
      }),
    ]);
    expect(result.artifact?.bytecodeModules).toEqual([new Uint8Array([7, 8, 9])]);
  });

  it("rejects before compilation starts when the request is already aborted", async () => {
    const flow = createDefaultContractFlow();
    const controller = new AbortController();
    controller.abort();

    await expect(
      compilePipeline({
        nodes: flow.nodes,
        edges: flow.edges,
        moduleName: "starter_contract",
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(vi.mocked(compileMove)).not.toHaveBeenCalled();
  });

  it("rejects with AbortError when the request is aborted during the WASM compile step", async () => {
    const flow = createDefaultContractFlow();
    const controller = new AbortController();
    let resolveCompile: ((value: Awaited<ReturnType<typeof compileMove>>) => void) | undefined;

    vi.mocked(compileMove).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCompile = resolve;
        }),
    );

    const compilationPromise = compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: "starter_contract",
      signal: controller.signal,
    });

    await Promise.resolve();
    controller.abort();
    resolveCompile?.({
      success: true,
      modules: [new Uint8Array([1, 2, 3])],
      dependencies: [],
      errors: null,
      warnings: [],
      artifact: {
        moduleName: "starter_contract",
        sourceFilePath: "sources/starter_contract.move",
        moveToml: "[package]\nname = \"starter_contract\"\n",
        moveSource: "module builder_extensions::starter_contract {}",
        sourceMap: [],
        dependencies: [],
        bytecodeModules: [new Uint8Array([1, 2, 3])],
      },
    });

    await expect(compilationPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(vi.mocked(compileMove)).toHaveBeenCalledTimes(1);
  });

  it.each(compileableSmartTurretExtensions)(
    "selects the reference template for $extensionId when compiled via display name",
    async ({ contractName, fixture }) => {
      const flow = createFlowFromFixture(fixture);
      const result = await compilePipeline({
        nodes: flow.nodes,
        edges: flow.edges,
        moduleName: contractName,
      });

      expect(result.status.state).toBe("compiled");
      expect(result.artifact?.moduleName).toBe(fixture.moduleName);
      expect(result.artifact?.moveSource).toContain(`module builder_extensions::${fixture.moduleName}`);

      // All reference templates must include the critical safety rules
      // that the world contract's default turret logic enforces
      const moveSource = result.artifact?.moveSource ?? "";
      expect(moveSource).toContain("owner_character_id");
      expect(moveSource).toContain("BEHAVIOUR_STOPPED_ATTACK");
      expect(moveSource).toContain("return (0, false)");
      expect(moveSource).toContain("BEHAVIOUR_STARTED_ATTACK");
    },
  );
});