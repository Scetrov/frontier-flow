import type { BuildResult } from "@zktx.io/sui-move-builder/lite";

import { parseCompilerOutput } from "./errorParser";
import type { CompileResult, SourceMapEntry } from "./types";

type MoveCompilerModule = typeof import("@zktx.io/sui-move-builder/lite");

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
    compilerModulePromise = import("@zktx.io/sui-move-builder/lite");
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

function isBuildSuccess(result: BuildResult): result is Extract<BuildResult, { readonly modules: string[] }> {
  return "modules" in result;
}

/**
 * Compile Move source in memory via the browser WASM wrapper.
 */
export async function compileMove(
  code: string,
  moduleName: string,
  sourceMap: readonly SourceMapEntry[],
  moveToml: string,
): Promise<CompileResult> {
  if (shouldUseMockCompiler()) {
    return createMockCompileResult();
  }

  try {
    const compilerModule = await ensureCompilerInitialised();
    const result = await compilerModule.buildMovePackage({
      files: {
        "Move.toml": moveToml,
        [`sources/${moduleName}.move`]: code,
      },
      silenceWarnings: false,
      network: "testnet",
    });

    if (isBuildSuccess(result)) {
      const warnings = result.warnings === undefined ? [] : parseCompilerOutput(result.warnings, sourceMap);

      return {
        success: true,
        modules: result.modules.map((moduleBytes) => decodeBase64(moduleBytes)),
        dependencies: result.dependencies,
        errors: null,
        warnings,
      };
    }

    return {
      success: false,
      modules: null,
      dependencies: null,
      errors: parseCompilerOutput(result.error, sourceMap),
      warnings: [],
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      modules: null,
      dependencies: null,
      errors: parseCompilerOutput(rawMessage, sourceMap),
      warnings: [],
    };
  }
}