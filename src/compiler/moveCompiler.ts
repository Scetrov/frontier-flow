import { attachCompiledArtifactResult } from "./generators/shared";
import { parseCompilerOutput } from "./errorParser";
import type { CompileResult, GeneratedContractArtifact } from "./types";

interface BuildSuccessResult {
  readonly modules: readonly string[];
  readonly dependencies?: readonly string[];
  readonly warnings?: string;
}

interface BuildErrorResult {
  readonly error: string;
}

type BuildResult = BuildSuccessResult | BuildErrorResult;

interface MoveCompilerModule {
  initMoveCompiler(): Promise<void>;
  buildMovePackage(input: {
    readonly files: Readonly<Record<string, string>>;
    readonly silenceWarnings: boolean;
    readonly network: string;
  }): Promise<BuildResult>;
}

const MOVE_COMPILER_MODULE_ID = "@zktx.io/sui-move-builder/lite";

let compilerModulePromise: Promise<MoveCompilerModule> | null = null;
let initialisationPromise: Promise<void> | null = null;

function shouldUseMockCompiler(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("ff_mock_compiler") === "1";
}

function getMockCompilerDelayMs(): number {
  if (typeof window === "undefined") {
    return 150;
  }

  const value = new URLSearchParams(window.location.search).get("ff_mock_compile_delay_ms");
  if (value === null) {
    return 150;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 150;
}

async function createMockCompileResult(): Promise<CompileResult> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, getMockCompilerDelayMs());
  });

  return {
    success: true,
    modules: [new Uint8Array([1, 2, 3, 4])],
    dependencies: [],
    errors: null,
    warnings: [],
    artifact: null,
  };
}

function decodeBase64(value: string): Uint8Array {
  const decode = globalThis.atob;
  if (typeof decode !== "function") {
    throw new Error("Base64 decoding is unavailable in this environment.");
  }

  const binary = decode(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function loadCompilerModule(): Promise<MoveCompilerModule> {
  if (compilerModulePromise === null) {
    compilerModulePromise = import(MOVE_COMPILER_MODULE_ID) as Promise<MoveCompilerModule>;
  }

  return compilerModulePromise;
}

async function ensureCompilerInitialised(): Promise<MoveCompilerModule> {
  const compilerModule = await loadCompilerModule();
  if (initialisationPromise === null) {
    initialisationPromise = compilerModule.initMoveCompiler();
  }

  await initialisationPromise;
  return compilerModule;
}

/**
 * Compile Move source in memory via the browser WASM wrapper.
 */
export async function compileMove(
  artifact: GeneratedContractArtifact,
): Promise<CompileResult> {
  if (shouldUseMockCompiler()) {
    const mockResult = await createMockCompileResult();
    if (!mockResult.success || mockResult.modules === null || mockResult.dependencies === null) {
      return mockResult;
    }

    return {
      ...mockResult,
      artifact: attachCompiledArtifactResult(artifact, mockResult.modules, mockResult.dependencies),
    };
  }

  try {
    const compilerModule = await ensureCompilerInitialised();
    const result = await compilerModule.buildMovePackage({
      files: {
        "Move.toml": artifact.moveToml,
        [artifact.sourceFilePath]: artifact.moveSource,
      },
      silenceWarnings: false,
      network: "testnet",
    });

    if ("modules" in result) {
      const warnings = result.warnings === undefined ? [] : parseCompilerOutput(result.warnings, artifact.sourceMap);
      const modules = result.modules.map((moduleBytes: string) => decodeBase64(moduleBytes));
      const dependencies = result.dependencies ?? [];

      return {
        success: true,
        modules,
        dependencies,
        errors: null,
        warnings,
        artifact: attachCompiledArtifactResult(artifact, modules, dependencies),
      };
    }

    if ("error" in result) {
      return {
        success: false,
        modules: null,
        dependencies: null,
        errors: parseCompilerOutput(result.error, artifact.sourceMap),
        warnings: [],
        artifact,
      };
    }

    return {
      success: false,
      modules: null,
      dependencies: null,
      errors: parseCompilerOutput("Unknown Move compilation failure.", artifact.sourceMap),
      warnings: [],
      artifact,
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      modules: null,
      dependencies: null,
      errors: parseCompilerOutput(rawMessage, artifact.sourceMap),
      warnings: [],
      artifact,
    };
  }
}