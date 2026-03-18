import { beforeEach, describe, expect, it, vi } from "vitest";

import expectedDefaultTurret from "../../__fixtures__/move/default-turret.move?raw";
import expectedSupportedArtifact from "../../__fixtures__/move/graph-to-move-supported.move?raw";
import supportedGraphText from "../../__fixtures__/graphs/graph-to-move-supported.json?raw";

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

interface GraphFixtureNode {
  readonly id: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly y: number };
}

interface GraphFixtureEdge {
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
}

interface GraphFixture {
  readonly moduleName: string;
  readonly nodes: readonly GraphFixtureNode[];
  readonly edges: readonly GraphFixtureEdge[];
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
    expect(result.code?.trim()).toBe(expectedDefaultTurret.trim());
  });

  it("compiles the supported fixture graph into the expected artifact", async () => {
    const flow = createFlowFromFixture(supportedGraphFixture);
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: supportedGraphFixture.moduleName,
    });

    expect(result.status.state).toBe("compiled");
    expect(result.code?.trim()).toBe(expectedSupportedArtifact.trim());
    expect(result.artifact?.moveSource.trim()).toBe(expectedSupportedArtifact.trim());
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
});