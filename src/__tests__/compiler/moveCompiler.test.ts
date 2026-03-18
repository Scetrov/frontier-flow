import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  graphToMoveBytecodeFixture,
  graphToMoveDependencyFixture,
} from "../../__fixtures__/compiler/graph-to-move-bytecode";
import {
  graphToMoveMultipleCompilerMessages,
  graphToMoveUnsupportedNodeError,
} from "../../__fixtures__/compiler/graph-to-move-errors";

const mockInitMoveCompiler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockBuildMovePackage = vi.fn();

vi.mock("@zktx.io/sui-move-builder/lite", () => ({
  initMoveCompiler: mockInitMoveCompiler,
  buildMovePackage: mockBuildMovePackage,
}));

import { compileMove } from "../../compiler/moveCompiler";

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function createArtifact() {
  return {
    moduleName: "graph_to_move_supported",
    sourceFilePath: "sources/graph_to_move_supported.move",
    moveToml: "[package]\nname = \"graph_to_move_supported\"\n",
    moveSource: "module builder_extensions::graph_to_move_supported {}",
    sourceMap: [
      {
        line: 10,
        astNodeId: "unsupported_node",
        reactFlowNodeId: "unsupported_node",
      },
      {
        line: 14,
        astNodeId: "queue_1",
        reactFlowNodeId: "queue_1",
      },
    ],
    dependencies: [],
    bytecodeModules: [],
  } as const;
}

describe("compileMove", () => {
  beforeEach(() => {
    mockInitMoveCompiler.mockClear();
    mockBuildMovePackage.mockReset();
  });

  it("compiles the generated artifact package and attaches decoded bytecode plus dependencies", async () => {
    const artifact = createArtifact();

    mockBuildMovePackage.mockResolvedValueOnce({
      modules: graphToMoveBytecodeFixture.map((moduleBytes) => encodeBase64(moduleBytes)),
      dependencies: graphToMoveDependencyFixture,
      warnings: graphToMoveMultipleCompilerMessages,
    });

    const result = await compileMove(artifact);

    expect(mockInitMoveCompiler).toHaveBeenCalledTimes(1);
    expect(mockBuildMovePackage).toHaveBeenCalledWith({
      files: {
        "Move.toml": artifact.moveToml,
        [artifact.sourceFilePath]: artifact.moveSource,
      },
      silenceWarnings: false,
      network: "testnet",
    });
    expect(result.success).toBe(true);
    expect(result.modules).toEqual(graphToMoveBytecodeFixture);
    expect(result.dependencies).toEqual(graphToMoveDependencyFixture);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]?.stage).toBe("compilation");
    expect(result.artifact?.bytecodeModules).toEqual(graphToMoveBytecodeFixture);
    expect(result.artifact?.dependencies).toEqual(graphToMoveDependencyFixture);
  });

  it("maps compiler failures back to the generated artifact source map", async () => {
    const artifact = createArtifact();

    mockBuildMovePackage.mockResolvedValueOnce({
      error: graphToMoveUnsupportedNodeError,
    });

    const result = await compileMove(artifact);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toEqual(
      expect.objectContaining({
        stage: "compilation",
        line: 10,
        reactFlowNodeId: "unsupported_node",
      }),
    );
    expect(result.artifact).toEqual(artifact);
  });
});