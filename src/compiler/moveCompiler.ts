import { attachArtifactDiagnostics, attachCompiledArtifactResult } from "./generators/shared";
import type { BuildProgressEvent } from "@zktx.io/sui-move-builder/lite";
import {
  loadMoveBuilderLite,
  moveBuilderLiteWasmUrl,
  prewarmMoveBuilderLiteWasm,
  resetMoveBuilderLiteForTests,
  verifyMoveBuilderLiteIntegrity,
} from "./moveBuilderLite";
import { parseCompilerOutput } from "./errorParser";
import { createStandaloneWorldShimPackageFiles } from "./worldShim";
import type {
  CompileResult,
  GeneratedContractArtifact,
  ResolvedDependencies,
} from "./types";

interface MoveCompilerInitOptions {
  readonly wasm?: string | URL;
}

interface BuildSuccessResult {
  readonly modules: readonly string[];
  readonly dependencies?: readonly string[];
  readonly warnings?: string;
}

interface BuildErrorResult {
  readonly error: string;
}

type BuildResult = BuildSuccessResult | BuildErrorResult;

interface BuildRootGit {
  readonly git: string;
  readonly rev: string;
  readonly subdir?: string;
}

type BuildProgressHandler = (event: BuildProgressEvent) => void;

interface BuildInput {
  readonly files: Readonly<Record<string, string>>;
  readonly silenceWarnings: boolean;
  readonly network: string;
  readonly rootGit?: BuildRootGit;
  readonly resolvedDependencies?: ResolvedDependencies;
  readonly onProgress?: BuildProgressHandler;
}

interface MoveCompilerModule {
  initMoveCompiler(options?: MoveCompilerInitOptions): Promise<void>;
  buildMovePackage(input: BuildInput): Promise<BuildResult>;
}

type MoveCompilerLoader = () => Promise<MoveCompilerModule>;
type MoveCompilerIntegrityVerifier = () => Promise<void>;
type MoveCompilerWasmPrewarmer = (wasm: string | URL) => Promise<void>;

let compilerModulePromise: Promise<MoveCompilerModule> | null = null;
let initialisationPromise: Promise<void> | null = null;
let integrityPromise: Promise<void> | null = null;
let worldShimModuleSetPromise: Promise<ReadonlySet<string>> | null = null;
let compilerModuleLoader: MoveCompilerLoader = () => loadMoveBuilderLite() as Promise<MoveCompilerModule>;
let moveCompilerIntegrityVerifier: MoveCompilerIntegrityVerifier = verifyMoveBuilderLiteIntegrity;
let moveCompilerWasmPrewarmer: MoveCompilerWasmPrewarmer = prewarmMoveBuilderLiteWasm;

function resetCompilerState(): void {
  compilerModulePromise = null;
  initialisationPromise = null;
  integrityPromise = null;
  worldShimModuleSetPromise = null;
}

export function resetMoveCompilerStateForTests(): void {
  resetCompilerState();
  resetMoveBuilderLiteForTests();
  compilerModuleLoader = () => loadMoveBuilderLite() as Promise<MoveCompilerModule>;
  moveCompilerIntegrityVerifier = async () => {};
  moveCompilerWasmPrewarmer = async () => {};
}

export function setMoveCompilerLoaderForTests(loader: MoveCompilerLoader): void {
  resetCompilerState();
  compilerModuleLoader = loader;
}

export function setMoveCompilerIntegrityVerifierForTests(verifier: MoveCompilerIntegrityVerifier): void {
  resetCompilerState();
  moveCompilerIntegrityVerifier = verifier;
}

function getMockCompilerSearchParams(): URLSearchParams | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search);
}

function shouldUseMockCompiler(): boolean {
  return getMockCompilerSearchParams()?.get("ff_mock_compiler") === "1";
}

function getMockCompilerDelayMs(): number {
  const value = getMockCompilerSearchParams()?.get("ff_mock_compile_delay_ms");
  if (value === null) {
    return 150;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 150;
}

function getMockWarningText(): string | null {
  const value = getMockCompilerSearchParams()?.get("ff_mock_compile_warning");
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value === "1"
    ? "warning: mock compile warning at sources/starter_contract.move:8:9"
    : value;
}

function getMockErrorText(): string | null {
  const value = getMockCompilerSearchParams()?.get("ff_mock_compile_error");
  if (value === undefined || value === null || value.length === 0) {
    return null;
  }

  return value === "1"
    ? "error[E03001]: mock compile failure at sources/starter_contract.move:10:9"
    : value;
}

async function createMockCompileResult(artifact: GeneratedContractArtifact): Promise<CompileResult> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, getMockCompilerDelayMs());
  });

  const mockError = getMockErrorText();
  if (mockError !== null) {
    const errors = parseCompilerOutput(mockError, artifact.sourceMap);
    return {
      success: false,
      modules: null,
      dependencies: null,
      errors,
      warnings: [],
      artifact: attachArtifactDiagnostics(artifact, errors),
    };
  }

  const warningsText = getMockWarningText();
  const modules = [new Uint8Array([1, 2, 3, 4])];
  const dependencies: readonly string[] = [];
  const warnings = warningsText === null ? [] : parseCompilerOutput(warningsText, artifact.sourceMap);

  return {
    success: true,
    modules,
    dependencies,
    errors: null,
    warnings,
    artifact: attachArtifactDiagnostics(attachCompiledArtifactResult(artifact, modules, dependencies), warnings),
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

async function ensureMoveCompilerIntegrity(): Promise<void> {
  if (integrityPromise === null) {
    integrityPromise = moveCompilerIntegrityVerifier().catch((error: unknown) => {
      integrityPromise = null;
      throw error;
    });
  }

  await integrityPromise;
}

async function loadCompilerModule(): Promise<MoveCompilerModule> {
  if (compilerModulePromise === null) {
    compilerModulePromise = compilerModuleLoader().catch((error: unknown) => {
      resetCompilerState();
      throw error;
    });
  }

  return compilerModulePromise;
}

async function ensureCompilerInitialised(): Promise<MoveCompilerModule> {
  await ensureMoveCompilerIntegrity();
  const compilerModule = await loadCompilerModule();
  if (initialisationPromise === null) {
    initialisationPromise = moveCompilerWasmPrewarmer(moveBuilderLiteWasmUrl)
      .then(() => compilerModule.initMoveCompiler({ wasm: moveBuilderLiteWasmUrl }))
      .catch((error: unknown) => {
        resetCompilerState();
        throw error;
      });
  }

  await initialisationPromise;
  return compilerModule;
}

async function getWorldShimModuleSet(compilerModule: MoveCompilerModule): Promise<ReadonlySet<string>> {
  if (worldShimModuleSetPromise === null) {
    worldShimModuleSetPromise = compilerModule.buildMovePackage({
      files: createStandaloneWorldShimPackageFiles(),
      silenceWarnings: true,
      network: "testnet",
    }).then((result) => {
      if (!("modules" in result)) {
        throw new Error(`Failed to compile bundled world shim: ${result.error}`);
      }

      return new Set(result.modules);
    }).catch((error: unknown) => {
      worldShimModuleSetPromise = null;
      throw error;
    });
  }

  return worldShimModuleSetPromise;
}

function filterBundledDependencyModules(modules: readonly string[], bundledDependencyModules: ReadonlySet<string>): readonly string[] {
  const filteredModules = modules.filter((moduleBytes) => !bundledDependencyModules.has(moduleBytes));
  return filteredModules.length === 0 ? modules : filteredModules;
}

function artifactBundlesWorldShim(artifact: GeneratedContractArtifact): boolean {
  return (artifact.sourceFiles ?? []).some((file) => file.path.startsWith("deps/world/"));
}

function handleBuildSuccess(
  result: BuildSuccessResult,
  artifact: GeneratedContractArtifact,
  bundledDependencyModules: ReadonlySet<string> | null,
): CompileResult {
  const warnings = result.warnings === undefined ? [] : parseCompilerOutput(result.warnings, artifact.sourceMap);
  const compiledModules = bundledDependencyModules === null
    ? result.modules
    : filterBundledDependencyModules(result.modules, bundledDependencyModules);
  const modules = compiledModules.map((moduleBytes: string) => decodeBase64(moduleBytes));
  const dependencies = result.dependencies ?? [];

  return {
    success: true,
    modules,
    dependencies,
    errors: null,
    warnings,
    artifact: attachArtifactDiagnostics(attachCompiledArtifactResult(artifact, modules, dependencies), warnings),
  };
}

function handleBuildError(result: BuildErrorResult, artifact: GeneratedContractArtifact): CompileResult {
  const errors = parseCompilerOutput(result.error, artifact.sourceMap);
  return {
    success: false,
    modules: null,
    dependencies: null,
    errors,
    warnings: [],
    artifact: attachArtifactDiagnostics(artifact, errors),
  };
}

function handleCompileFailure(rawMessage: string, artifact: GeneratedContractArtifact): CompileResult {
  const errors = parseCompilerOutput(rawMessage, artifact.sourceMap);
  return {
    success: false,
    modules: null,
    dependencies: null,
    errors,
    warnings: [],
    artifact: attachArtifactDiagnostics(artifact, errors),
  };
}

/**
 * Compile Move source in memory via the browser WASM wrapper.
 */
export async function compileMove(
  artifact: GeneratedContractArtifact,
): Promise<CompileResult> {
  if (shouldUseMockCompiler()) {
    return createMockCompileResult(artifact);
  }

  try {
    const compilerModule = await ensureCompilerInitialised();
    const files: Record<string, string> = {
      "Move.toml": artifact.moveToml,
    };
    for (const file of artifact.sourceFiles ?? [{ path: artifact.sourceFilePath, content: artifact.moveSource }]) {
      files[file.path] = file.content;
    }
    const buildPromise = compilerModule.buildMovePackage({
      files,
      silenceWarnings: false,
      network: "testnet",
    });
    const bundledDependencyModulesPromise = artifactBundlesWorldShim(artifact)
      ? getWorldShimModuleSet(compilerModule)
      : Promise.resolve<ReadonlySet<string> | null>(null);
    const [result, bundledDependencyModules] = await Promise.all([buildPromise, bundledDependencyModulesPromise]);

    if ("modules" in result) {
      return handleBuildSuccess(result, artifact, bundledDependencyModules);
    }

    if ("error" in result) {
      return handleBuildError(result, artifact);
    }

    return handleCompileFailure("Unknown Move compilation failure.", artifact);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    return handleCompileFailure(rawMessage, artifact);
  }
}