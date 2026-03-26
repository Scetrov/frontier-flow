import type { BuildProgressEvent } from "@zktx.io/sui-move-builder/lite";
import {
  loadMoveBuilderLite,
  moveBuilderLiteWasmUrl,
  type BuildMovePackageFn,
  type GetSuiMoveVersionFn,
  type InitMoveCompilerFn,
  type ResolveDependenciesFn,
  verifyMoveBuilderLiteIntegrity,
} from "./moveBuilderLite";
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
const RESOLVED_WORLD_PACKAGE_NAME = "world";
const RESOLVED_WORLD_TEST_PREFIX_PATTERN = /^dependencies\/world\/tests\//i;
const RESOLVED_WORLD_ACCESS_CONTROL_PATH_PATTERN = /^dependencies\/world\/sources\/access\/access_control\.move$/i;
const RESOLVED_WORLD_PUBLISHED_TOML_PATTERN = /^dependencies\/world\/published\.toml$/i;
const UNSUPPORTED_CHARACTER_TRANSFER_CHECK = /let is_character =[\s\S]*?assert!\(!is_character, ECharacterTransfer\);/;
const COMPATIBLE_CHARACTER_TRANSFER_CHECK = [
  "let is_character = false;",
  "    assert!(!is_character, ECharacterTransfer);",
].join("\n");

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
  readonly buildMovePackage?: BuildMovePackageFn;
  readonly getSuiMoveVersion?: GetSuiMoveVersionFn;
  readonly initMoveCompiler?: InitMoveCompilerFn;
  readonly now?: () => number;
  readonly resolveDependencies?: ResolveDependenciesFn;
  readonly verifyMoveCompilerIntegrity?: () => Promise<void>;
}

interface ResolveDeployDependenciesOptions {
  readonly request: DeployGradeCompileRequest;
  readonly files: Record<string, string>;
  readonly rootGit: { readonly git: string; readonly rev: string; readonly subdir: string };
  readonly cacheKey: string;
  readonly resolve: ResolveDependenciesFn;
  readonly now: () => number;
}

interface BuildDeployArtifactOptions {
  readonly request: DeployGradeCompileRequest;
  readonly files: Record<string, string>;
  readonly rootGit: { readonly git: string; readonly rev: string; readonly subdir: string };
  readonly resolvedDependencies: ResolvedDependencies;
  readonly build: BuildMovePackageFn;
}

const resolutionCache = new Map<string, CachedDependencyResolution>();

function getResolutionCacheKey(targetId: string, sourceVersionTag: string): string {
  return `${targetId}:${sourceVersionTag}`;
}

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

interface ResolvedDependencyPackageSnapshot {
  readonly name?: string;
  readonly files?: Record<string, string>;
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

function sanitizeResolvedDependencies(resolvedDependencies: ResolvedDependencies): ResolvedDependencies {
  let dependencyPackages: unknown;

  try {
    dependencyPackages = JSON.parse(resolvedDependencies.dependencies);
  } catch {
    return resolvedDependencies;
  }

  if (!Array.isArray(dependencyPackages)) {
    return resolvedDependencies;
  }

  let changed = false;
  const sanitizedDependencyPackages = dependencyPackages.map((dependencyPackage) => {
    if (typeof dependencyPackage !== "object" || dependencyPackage === null) {
      return dependencyPackage;
    }

    const snapshot = dependencyPackage as ResolvedDependencyPackageSnapshot;
    if (snapshot.name?.toLowerCase() !== RESOLVED_WORLD_PACKAGE_NAME || snapshot.files === undefined) {
      return dependencyPackage;
    }

    const nextFiles = { ...snapshot.files };

    for (const filePath of Object.keys(nextFiles)) {
      if (RESOLVED_WORLD_TEST_PREFIX_PATTERN.test(filePath)) {
        delete nextFiles[filePath];
        changed = true;
      }
    }

    const accessControlPath = Object.keys(nextFiles).find((filePath) => RESOLVED_WORLD_ACCESS_CONTROL_PATH_PATTERN.test(filePath));
    const accessControlSource = accessControlPath === undefined ? undefined : nextFiles[accessControlPath];
    if (typeof accessControlSource === "string" && accessControlPath !== undefined && UNSUPPORTED_CHARACTER_TRANSFER_CHECK.test(accessControlSource)) {
      nextFiles[accessControlPath] = accessControlSource.replace(
        UNSUPPORTED_CHARACTER_TRANSFER_CHECK,
        COMPATIBLE_CHARACTER_TRANSFER_CHECK,
      );
      changed = true;
    }

    return {
      ...dependencyPackage,
      files: nextFiles,
    };
  });

  if (!changed) {
    return resolvedDependencies;
  }

  return {
    ...resolvedDependencies,
    dependencies: JSON.stringify(sanitizedDependencyPackages),
  };
}

function patchWorldPublishedAddress(
  resolvedDependencies: ResolvedDependencies,
  worldPackageId: string,
): ResolvedDependencies {
  let dependencyPackages: unknown;

  try {
    dependencyPackages = JSON.parse(resolvedDependencies.dependencies);
  } catch {
    return resolvedDependencies;
  }

  if (!Array.isArray(dependencyPackages)) {
    return resolvedDependencies;
  }

  let changed = false;
  const patchedPackages = dependencyPackages.map((dependencyPackage) => {
    if (typeof dependencyPackage !== "object" || dependencyPackage === null) {
      return dependencyPackage;
    }

    const snapshot = dependencyPackage as ResolvedDependencyPackageSnapshot;
    if (snapshot.name?.toLowerCase() !== RESOLVED_WORLD_PACKAGE_NAME || snapshot.files === undefined) {
      return dependencyPackage;
    }

    const publishedTomlPath = Object.keys(snapshot.files).find((filePath) =>
      RESOLVED_WORLD_PUBLISHED_TOML_PATTERN.test(filePath),
    );

    if (publishedTomlPath === undefined) {
      return dependencyPackage;
    }

    const existingContent = snapshot.files[publishedTomlPath];
    if (typeof existingContent !== "string") {
      return dependencyPackage;
    }

    const patched = existingContent
      .replace(/(published-at\s*=\s*")[^"]+(")/g, (_, before, after) => `${before}${worldPackageId}${after}`)
      .replace(/(original-id\s*=\s*")[^"]+(")/g, (_, before, after) => `${before}${worldPackageId}${after}`);

    if (patched === existingContent) {
      return dependencyPackage;
    }

    changed = true;
    return {
      ...dependencyPackage,
      files: {
        ...snapshot.files,
        [publishedTomlPath]: patched,
      },
    };
  });

  if (!changed) {
    return resolvedDependencies;
  }

  return {
    ...resolvedDependencies,
    dependencies: JSON.stringify(patchedPackages),
  };
}

function getCompilerDependencies(dependencies: DeployGradeCompilerDependencies) {
  return {
    init: dependencies.initMoveCompiler,
    resolve: dependencies.resolveDependencies,
    build: dependencies.buildMovePackage,
    getVersion: dependencies.getSuiMoveVersion,
    now: dependencies.now ?? Date.now,
    verifyIntegrity: dependencies.verifyMoveCompilerIntegrity ?? verifyMoveBuilderLiteIntegrity,
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
  const isValidCachedResolution = cachedResolution !== undefined
    && cachedResolution.targetId === request.target.targetId
    && cachedResolution.sourceVersionTag === request.worldSource.sourceVersionTag;
  if (isValidCachedResolution) {
    return sanitizeResolvedDependencies(cachedResolution.resolvedDependencies);
  }

  request.onProgress?.({ phase: "resolving-dependencies", current: 0, total: 0 });

  try {
    const resolvedDependencies = sanitizeResolvedDependencies(await resolve({
      files,
      wasm: moveBuilderLiteWasmUrl,
      rootGit,
      network: "testnet",
      silenceWarnings: false,
      onProgress: (event) => {
        const mapped = toDeployProgress(event);
        if (mapped !== null) {
          request.onProgress?.(mapped);
        }
      },
    }));

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
      wasm: moveBuilderLiteWasmUrl,
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
  const { init, resolve, build, getVersion, now, verifyIntegrity } = getCompilerDependencies(dependencies);
  const compilerModule = await loadMoveBuilderLite();
  const initCompiler = init ?? compilerModule.initMoveCompiler;
  const resolveCompilerDependencies = resolve ?? compilerModule.resolveDependencies;
  const buildCompilerPackage = build ?? compilerModule.buildMovePackage;
  const getCompilerVersion = getVersion ?? compilerModule.getSuiMoveVersion;
  const files = createFileMap(request);
  const cacheKey = getResolutionCacheKey(request.target.targetId, request.worldSource.sourceVersionTag);
  const rootGit = createRootGit(request.worldSource.sourceVersionTag);

  await verifyIntegrity();
  await initCompiler({ wasm: moveBuilderLiteWasmUrl });
  const resolvedDependencies = await resolveDeployDependencies({ request, files, rootGit, cacheKey, resolve: resolveCompilerDependencies, now });
  const patchedDependencies = patchWorldPublishedAddress(resolvedDependencies, request.target.worldPackageId);
  const buildResult = await buildDeployArtifact({ request, files, rootGit, resolvedDependencies: patchedDependencies, build: buildCompilerPackage });

  return {
    modules: buildResult.modules.map((moduleBytes) => decodeBase64(moduleBytes)),
    dependencies: buildResult.dependencies,
    digest: buildResult.digest,
    resolvedDependencies,
    targetId: request.target.targetId,
    sourceVersionTag: request.worldSource.sourceVersionTag,
    builderToolchainVersion: await getCompilerVersion({ wasm: moveBuilderLiteWasmUrl }),
    compiledAt: now(),
  };
}