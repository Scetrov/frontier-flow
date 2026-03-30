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
const mockFetchPackageFromGitHub = vi.fn();

vi.mock("@zktx.io/sui-move-builder/lite", () => ({
  initMoveCompiler: mockInitMoveCompiler,
  buildMovePackage: mockBuildMovePackage,
  fetchPackageFromGitHub: mockFetchPackageFromGitHub,
}));

import {
  compileMove,
  resetMoveCompilerStateForTests,
  setMoveCompilerIntegrityVerifierForTests,
  setMoveCompilerLoaderForTests,
} from "../../compiler/moveCompiler";
import { createStandaloneWorldShimPackageFiles } from "../../compiler/worldShim";

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
    mockInitMoveCompiler.mockResolvedValue(undefined);
    resetMoveCompilerStateForTests();
    window.history.replaceState({}, "", "/");
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
    expect(result.artifact).toEqual(
      expect.objectContaining({
        ...artifact,
        diagnostics: result.errors,
      }),
    );
  });

  it("uses the mock compiler path when requested by the URL and still attaches the artifact", async () => {
    const artifact = createArtifact();
    window.history.replaceState({}, "", "/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0");

    const result = await compileMove(artifact);

    expect(mockInitMoveCompiler).not.toHaveBeenCalled();
    expect(mockBuildMovePackage).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.modules).toEqual([new Uint8Array([1, 2, 3, 4])]);
    expect(result.dependencies).toEqual([]);
    expect(result.artifact?.bytecodeModules).toEqual([new Uint8Array([1, 2, 3, 4])]);
    expect(result.artifact?.sourceFilePath).toBe(artifact.sourceFilePath);
  });

  it("surfaces configured mock compiler warnings while still succeeding", async () => {
    const artifact = createArtifact();
    window.history.replaceState({}, "", "/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_mock_compile_warning=1");

    const result = await compileMove(artifact);

    expect(result.success).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          line: 8,
        }),
      ]),
    );
    expect(result.artifact?.bytecodeModules).toEqual([new Uint8Array([1, 2, 3, 4])]);
  });

  it("surfaces configured mock compiler failures as compilation diagnostics", async () => {
    const artifact = createArtifact();
    window.history.replaceState({}, "", "/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_mock_compile_error=1");

    const result = await compileMove(artifact);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          line: 10,
        }),
      ]),
    );
    expect(result.artifact).toEqual(
      expect.objectContaining({
        ...artifact,
        diagnostics: result.errors,
      }),
    );
  });

  it("surfaces thrown compiler-wrapper errors while preserving the generated artifact", async () => {
    const artifact = createArtifact();
    mockBuildMovePackage.mockRejectedValueOnce(new Error("WASM compile exploded"));

    const result = await compileMove(artifact);

    expect(result.success).toBe(false);
    expect(result.modules).toBeNull();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "compilation",
          rawMessage: "WASM compile exploded",
        }),
      ]),
    );
    expect(result.artifact).toEqual(
      expect.objectContaining({
        ...artifact,
        diagnostics: result.errors,
      }),
    );
  });

  it("retries the compiler module import after a transient loader failure", async () => {
    const artifact = createArtifact();
    const fallbackModule = {
      initMoveCompiler: mockInitMoveCompiler,
      buildMovePackage: mockBuildMovePackage,
    };
    const transientImportError = new Error("dynamic import failed once");
    const loader = vi.fn<() => Promise<typeof fallbackModule>>()
      .mockRejectedValueOnce(transientImportError)
      .mockResolvedValue(fallbackModule);

    setMoveCompilerLoaderForTests(loader);
    mockBuildMovePackage.mockResolvedValueOnce({
      modules: graphToMoveBytecodeFixture.map((moduleBytes) => encodeBase64(moduleBytes)),
      dependencies: graphToMoveDependencyFixture,
    });

    const firstResult = await compileMove(artifact);
    const secondResult = await compileMove(artifact);

    expect(firstResult.success).toBe(false);
    expect(firstResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rawMessage: "dynamic import failed once" }),
      ]),
    );
    expect(secondResult.success).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("retries compiler initialisation after a transient init failure", async () => {
    const artifact = createArtifact();
    mockInitMoveCompiler
      .mockRejectedValueOnce(new Error("init failed once"))
      .mockResolvedValue(undefined);
    mockBuildMovePackage.mockResolvedValueOnce({
      modules: graphToMoveBytecodeFixture.map((moduleBytes) => encodeBase64(moduleBytes)),
      dependencies: graphToMoveDependencyFixture,
    });

    const firstResult = await compileMove(artifact);
    const secondResult = await compileMove(artifact);

    expect(firstResult.success).toBe(false);
    expect(firstResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rawMessage: "init failed once" }),
      ]),
    );
    expect(secondResult.success).toBe(true);
    expect(mockInitMoveCompiler).toHaveBeenCalledTimes(2);
    expect(mockBuildMovePackage).toHaveBeenCalledTimes(1);
  });

  it("suppresses verbose move builder logs by default", async () => {
    const artifact = createArtifact();
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockBuildMovePackage.mockImplementationOnce(() => {
      console.log("[Compile] pkgId=Sui, pkgName=Sui, hasFiles=true, manifestName=Sui");
      console.log("[V3 Files] Storing: Sui (manifest: Sui)");

      return {
        modules: graphToMoveBytecodeFixture.map((moduleBytes) => encodeBase64(moduleBytes)),
        dependencies: graphToMoveDependencyFixture,
      };
    });

    try {
      const result = await compileMove(artifact);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  it("preserves verbose move builder logs when debug logging is enabled", async () => {
    const artifact = createArtifact();
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    window.history.replaceState({}, "", "/?DEBUG=true");
    mockBuildMovePackage.mockImplementationOnce(() => {
      console.log("[Compile] pkgId=Sui, pkgName=Sui, hasFiles=true, manifestName=Sui");

      return {
        modules: graphToMoveBytecodeFixture.map((moduleBytes) => encodeBase64(moduleBytes)),
        dependencies: graphToMoveDependencyFixture,
      };
    });

    try {
      const result = await compileMove(artifact);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith("[Compile] pkgId=Sui, pkgName=Sui, hasFiles=true, manifestName=Sui");
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  it("fails closed when the bundled WASM integrity verification fails", async () => {
    const artifact = createArtifact();
    setMoveCompilerIntegrityVerifierForTests(() => Promise.reject(new Error("Bundled Move compiler checksum mismatch")));

    const result = await compileMove(artifact);

    expect(result.success).toBe(false);
    expect(mockInitMoveCompiler).not.toHaveBeenCalled();
    expect(mockBuildMovePackage).not.toHaveBeenCalled();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawMessage: "Bundled Move compiler checksum mismatch",
        }),
      ]),
    );
  });

  it("passes bundled dependency source files to the WASM package builder", async () => {
    const shimModuleBytes = new Uint8Array([9, 9, 9]);
    const rootModuleBytes = new Uint8Array([7, 7, 7]);
    const artifact = {
      ...createArtifact(),
      sourceFiles: [
        { path: "sources/graph_to_move_supported.move", content: "module builder_extensions::graph_to_move_supported {}" },
        { path: "deps/world/Move.toml", content: "[package]\nname = \"world\"\n\n[addresses]\nworld = \"0x0\"\n" },
        { path: "deps/world/sources/character.move", content: "module world::character;" },
        { path: "deps/world/sources/in_game_id.move", content: "module world::in_game_id;" },
        { path: "deps/world/sources/turret.move", content: "module world::turret;" },
      ],
    } as const;

    mockBuildMovePackage
      .mockResolvedValueOnce({
        modules: [encodeBase64(rootModuleBytes), encodeBase64(shimModuleBytes)],
        dependencies: graphToMoveDependencyFixture,
      })
      .mockResolvedValueOnce({
        modules: [encodeBase64(shimModuleBytes)],
        dependencies: [],
      });

    const result = await compileMove(artifact);

    expect(result.success).toBe(true);
    expect(result.modules).toEqual([rootModuleBytes]);
    expect(result.artifact?.bytecodeModules).toEqual([rootModuleBytes]);
    expect(mockBuildMovePackage).toHaveBeenNthCalledWith(1, {
      files: {
        "Move.toml": artifact.moveToml,
        "sources/graph_to_move_supported.move": "module builder_extensions::graph_to_move_supported {}",
        "deps/world/Move.toml": "[package]\nname = \"world\"\n\n[addresses]\nworld = \"0x0\"\n",
        "deps/world/sources/character.move": "module world::character;",
        "deps/world/sources/in_game_id.move": "module world::in_game_id;",
        "deps/world/sources/turret.move": "module world::turret;",
      },
      silenceWarnings: false,
      network: "testnet",
    });
    expect(mockBuildMovePackage).toHaveBeenNthCalledWith(2, {
      files: createStandaloneWorldShimPackageFiles(),
      silenceWarnings: true,
      network: "testnet",
    });
  });
});