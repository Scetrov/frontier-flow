import {
  buildMovePackage,
  type BuildProgressEvent,
  getSuiMoveVersion,
  initMoveCompiler,
  resolveDependencies,
} from "@zktx.io/sui-move-builder/lite";
import type {
  CachedDependencyResolution,
  DeployCompileProgressEvent,
  DeployGradeCompileRequest,
  DeployGradeCompileResult,
  ResolvedDependencies,
} from "./types";
import { DeployCompilationError as DeployCompilationErrorClass, DependencyResolutionError as DependencyResolutionErrorClass } from "./types";

const WORLD_CONTRACTS_GIT_URL = "https://github.com/evefrontier/world-contracts.git";
const WORLD_CONTRACTS_SUBDIRECTORY = "contracts/world";

interface BuildSuccessResult {
  readonly modules: readonly string[];
  readonly dependencies: readonly string[];
  readonly digest: readonly number[];
  readonly warnings?: string;
}

interface BuildErrorResult {
  readonly error: string;
}

interface DeployGradeCompilerDependencies {
  readonly buildMovePackage?: typeof buildMovePackage;
  readonly getSuiMoveVersion?: typeof getSuiMoveVersion;
  readonly initMoveCompiler?: typeof initMoveCompiler;
  readonly now?: () => number;
  readonly resolveDependencies?: typeof resolveDependencies;
}

interface ResolveDeployDependenciesOptions {
  readonly request: DeployGradeCompileRequest;
  readonly files: Record<string, string>;
  readonly rootGit: { readonly git: string; readonly rev: string; readonly subdir: string };
  readonly cacheKey: string;
  readonly resolve: typeof resolveDependencies;
  readonly now: () => number;
}

interface BuildDeployArtifactOptions {
  readonly request: DeployGradeCompileRequest;
  readonly files: Record<string, string>;
  readonly rootGit: { readonly git: string; readonly rev: string; readonly subdir: string };
  readonly resolvedDependencies: ResolvedDependencies;
  readonly build: typeof buildMovePackage;
}

const resolutionCache = new Map<string, CachedDependencyResolution>();

function getResolutionCacheKey(targetId: string, sourceVersionTag: string): string {
  return `${targetId}:${sourceVersionTag}`;
}

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createRootGit(revision: string): { readonly git: string; readonly rev: string; readonly subdir: string } {
  return {
    git: WORLD_CONTRACTS_GIT_URL,
    rev: revision,
    subdir: WORLD_CONTRACTS_SUBDIRECTORY,
  };
}

function createFileMap(request: DeployGradeCompileRequest): Record<string, string> {
  const files: Record<string, string> = {
    "Move.toml": rewriteMoveTomlForDeployGrade(request.artifact.moveToml, request.worldSource.sourceVersionTag),
  };

  for (const file of request.artifact.sourceFiles ?? [{ path: request.artifact.sourceFilePath, content: request.artifact.moveSource }]) {
    if (file.path.startsWith("deps/world/")) {
      continue;
    }

    files[file.path] = file.content;
  }

  return files;
}

function getCompilerDependencies(dependencies: DeployGradeCompilerDependencies) {
  return {
    init: dependencies.initMoveCompiler ?? initMoveCompiler,
    resolve: dependencies.resolveDependencies ?? resolveDependencies,
    build: dependencies.buildMovePackage ?? buildMovePackage,
    getVersion: dependencies.getSuiMoveVersion ?? getSuiMoveVersion,
    now: dependencies.now ?? Date.now,
  };
}

function rewriteMoveTomlForDeployGrade(moveToml: string, sourceVersionTag: string): string {
  const withoutWorldAddress = moveToml
    .split("\n")
    .filter((line) => !/^\s*world\s*=\s*"[^"]+"\s*$/.test(line))
    .join("\n");

  if (/world\s*=\s*\{\s*local\s*=\s*"deps\/world"\s*\}/.test(withoutWorldAddress)) {
    return withoutWorldAddress.replace(
      /world\s*=\s*\{\s*local\s*=\s*"deps\/world"\s*\}/,
      `world = { git = "${WORLD_CONTRACTS_GIT_URL}", rev = "${sourceVersionTag}", subdir = "${WORLD_CONTRACTS_SUBDIRECTORY}" }`,
    );
  }

  return `${withoutWorldAddress.trimEnd()}\nworld = { git = "${WORLD_CONTRACTS_GIT_URL}", rev = "${sourceVersionTag}", subdir = "${WORLD_CONTRACTS_SUBDIRECTORY}" }\n`;
}

function toDeployProgress(event: BuildProgressEvent): DeployCompileProgressEvent | null {
  switch (event.type) {
    case "resolve_start":
      return { phase: "resolving-dependencies", current: 0, total: 0 };
    case "resolve_dep":
      return {
        phase: "resolving-dependencies",
        current: event.current,
        total: event.total,
      };
    case "resolve_complete":
      return {
        phase: "resolving-dependencies",
        current: event.count,
        total: event.count,
      };
    case "compile_start":
      return { phase: "compiling" };
    case "compile_complete":
      return { phase: "complete" };
    case "lockfile_generate":
      return null;
  }
}

function classifyResolutionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("cors") || normalizedMessage.includes("rate limit") || normalizedMessage.includes("network") || normalizedMessage.includes("fetch")) {
    return new DependencyResolutionErrorClass(message, {
      userMessage: "Dependency resolution could not reach the upstream world package.",
      suggestedAction: "Retry deployment after confirming network access to GitHub, or try again once rate limits reset.",
      cause: error,
    });
  }

  return new DependencyResolutionErrorClass(message, {
    userMessage: "Dependency resolution failed before deploy-grade compilation could start.",
    suggestedAction: "Retry deployment after confirming the selected target metadata is still valid.",
    cause: error,
  });
}

function classifyCompilationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("link") || normalizedMessage.includes("address with no value")) {
    return new DeployCompilationErrorClass(message, {
      userMessage: "Deploy-grade compilation failed because dependency linking did not match the live world package.",
      suggestedAction: "Refresh the target metadata and rebuild the extension before retrying deployment.",
      cause: error,
    });
  }

  return new DeployCompilationErrorClass(message, {
    userMessage: "Deploy-grade compilation failed for the selected target.",
    suggestedAction: "Review the compiler diagnostics and generated Move package before retrying.",
    cause: error,
  });
}

async function resolveDeployDependencies(
  options: ResolveDeployDependenciesOptions,
): Promise<ResolvedDependencies> {
  const { request, files, rootGit, cacheKey, resolve, now } = options;
  const cachedResolution = request.cachedResolution ?? resolutionCache.get(cacheKey);
  if (cachedResolution !== undefined) {
    return cachedResolution.resolvedDependencies;
  }

  request.onProgress?.({ phase: "resolving-dependencies", current: 0, total: 0 });

  try {
    const resolvedDependencies = await resolve({
      files,
      rootGit,
      network: "testnet",
      silenceWarnings: false,
      onProgress: (event) => {
        const mapped = toDeployProgress(event);
        if (mapped !== null) {
          request.onProgress?.(mapped);
        }
      },
    });

    resolutionCache.set(cacheKey, {
      targetId: request.target.targetId,
      sourceVersionTag: request.worldSource.sourceVersionTag,
      resolvedDependencies,
      resolvedAt: now(),
    });
    return resolvedDependencies;
  } catch (error) {
    throw classifyResolutionError(error);
  }
}

async function buildDeployArtifact(
  options: BuildDeployArtifactOptions,
): Promise<BuildSuccessResult> {
  const { request, files, rootGit, resolvedDependencies, build } = options;
  request.onProgress?.({ phase: "compiling" });

  let buildResult: BuildSuccessResult | BuildErrorResult;
  try {
    buildResult = await build({
      files,
      rootGit,
      network: "testnet",
      silenceWarnings: false,
      resolvedDependencies,
      onProgress: (event) => {
        const mapped = toDeployProgress(event);
        if (mapped !== null) {
          request.onProgress?.(mapped);
        }
      },
    }) as BuildSuccessResult | BuildErrorResult;
  } catch (error) {
    throw classifyCompilationError(error);
  }

  if ("error" in buildResult) {
    throw classifyCompilationError(new Error(buildResult.error));
  }

  request.onProgress?.({ phase: "complete" });
  return buildResult;
}

/**
 * Reset the cached dependency-resolution snapshot for tests.
 */
export function resetDeployGradeCompilerStateForTests(): void {
  resolutionCache.clear();
}

/**
 * Compile a generated artifact against the live upstream world dependency graph.
 */
export async function compileForDeployment(
  request: DeployGradeCompileRequest,
  dependencies: DeployGradeCompilerDependencies = {},
): Promise<DeployGradeCompileResult> {
  const { init, resolve, build, getVersion, now } = getCompilerDependencies(dependencies);
  const files = createFileMap(request);
  const cacheKey = getResolutionCacheKey(request.target.targetId, request.worldSource.sourceVersionTag);
  const rootGit = createRootGit(request.worldSource.sourceVersionTag);

  await init();
  const resolvedDependencies = await resolveDeployDependencies({ request, files, rootGit, cacheKey, resolve, now });
  const buildResult = await buildDeployArtifact({ request, files, rootGit, resolvedDependencies, build });

  return {
    modules: buildResult.modules.map((moduleBytes) => decodeBase64(moduleBytes)),
    dependencies: buildResult.dependencies,
    digest: buildResult.digest,
    resolvedDependencies,
    targetId: request.target.targetId,
    sourceVersionTag: request.worldSource.sourceVersionTag,
    builderToolchainVersion: await getVersion(),
    compiledAt: now(),
  };
}