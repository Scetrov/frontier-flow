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
  MaterializedDependencyTree,
  ResolvedDependencies,
  ResolvedDependencyPackageSnapshot,
} from "./types";
import { DeployCompilationError as DeployCompilationErrorClass, DependencyResolutionError as DependencyResolutionErrorClass } from "./types";
import { normalizeDependencyPackageName, parseResolvedDependencyPackages } from "../deployment/dependencySnapshotValidation";

const WORLD_CONTRACTS_GIT_URL = "https://github.com/evefrontier/world-contracts.git";
const WORLD_CONTRACTS_SUBDIRECTORY = "contracts/world";
const BUILT_IN_DEPENDENCY_PACKAGE_NAMES = new Set(["movestdlib", "sui"]);
const RESOLVED_WORLD_PACKAGE_NAME = "world";
const RESOLVED_WORLD_TEST_PREFIX_PATTERN = /^dependencies\/world\/tests\//i;
const RESOLVED_WORLD_ACCESS_CONTROL_PATH_PATTERN = /^dependencies\/world\/sources\/access\/access_control\.move$/i;

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

interface DeployGradeModuleSetDiagnostics {
  readonly targetId: string;
  readonly targetWorldPackageId: string;
  readonly sourceVersionTag: string;
  readonly packageMap: Readonly<Record<string, string>>;
  readonly rewritesApplied: readonly string[];
  readonly localFileCount: number;
  readonly localFileKeys: readonly string[];
  readonly worldOnlyFileCount: number;
  readonly worldOnlyFileKeys: readonly string[];
  readonly rootMoveToml: string | null;
  readonly worldMoveToml: string | null;
  readonly fullBuildModules: readonly string[];
  readonly worldOnlyModules: readonly string[] | null;
  readonly filteredModules: readonly string[];
  readonly fallbackApplied: boolean;
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

const resolutionCache = new Map<string, CachedDependencyResolution>();

function getResolutionCacheKey(targetId: string, sourceVersionTag: string): string {
  return `${targetId}:${sourceVersionTag}`;
}

function getDeployGradeCompilerSearchParams(): URLSearchParams | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search);
}

function shouldDebugDeployGradeModuleSets(): boolean {
  return getDeployGradeCompilerSearchParams()?.get("ff_debug_deploy_grade_modules") === "1";
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

function getDependencyLinkPackageId(target: DeployGradeCompileRequest["target"]): string {
  return target.originalWorldPackageId;
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

function sanitizeWorldDependencyFiles(files: Record<string, string>): {
  readonly files: Record<string, string>;
  readonly changed: boolean;
} {
  const nextFiles: Record<string, string> = {};
  let changed = false;

  for (const [filePath, fileContent] of Object.entries(files)) {
    if (RESOLVED_WORLD_TEST_PREFIX_PATTERN.test(filePath)) {
      changed = true;
      continue;
    }

    nextFiles[filePath] = fileContent;
  }

  const accessControlPath = Object.keys(nextFiles).find((filePath) => RESOLVED_WORLD_ACCESS_CONTROL_PATH_PATTERN.test(filePath));
  const accessControlSource = accessControlPath === undefined ? undefined : nextFiles[accessControlPath];
  if (
    accessControlPath !== undefined
    && typeof accessControlSource === "string"
    && UNSUPPORTED_CHARACTER_TRANSFER_CHECK.test(accessControlSource)
  ) {
    nextFiles[accessControlPath] = accessControlSource.replace(
      UNSUPPORTED_CHARACTER_TRANSFER_CHECK,
      COMPATIBLE_CHARACTER_TRANSFER_CHECK,
    );
    changed = true;
  }

  return { files: nextFiles, changed };
}

function sanitizeResolvedDependencies(resolvedDependencies: ResolvedDependencies): ResolvedDependencies {
  const dependencyPackages = parseResolvedDependencyPackages(resolvedDependencies);
  if (dependencyPackages === null) {
    return resolvedDependencies;
  }

  let changed = false;
  const sanitizedDependencyPackages: ResolvedDependencyPackageSnapshot[] = [];

  for (const dependencyPackage of dependencyPackages) {
    if (normalizeDependencyPackageName(dependencyPackage.name ?? "") !== RESOLVED_WORLD_PACKAGE_NAME || dependencyPackage.files === undefined) {
      sanitizedDependencyPackages.push(dependencyPackage);
      continue;
    }

    const sanitizedSnapshot = sanitizeWorldDependencyFiles(dependencyPackage.files);
    changed ||= sanitizedSnapshot.changed;

    sanitizedDependencyPackages.push({
      ...dependencyPackage,
      files: sanitizedSnapshot.files,
    });
  }

  if (!changed) {
    return resolvedDependencies;
  }

  return {
    ...resolvedDependencies,
    dependencies: JSON.stringify(sanitizedDependencyPackages),
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

function reportDeployGradeModuleSetDiagnostics(diagnostics: DeployGradeModuleSetDiagnostics): void {
  if (!shouldDebugDeployGradeModuleSets()) {
    return;
  }

  console.warn("[DeployGrade] Module sets", diagnostics);
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

function isAddressesSectionHeader(line: string): boolean {
  return /^\[addresses\]$/i.test(line.trim());
}

function isSectionHeader(line: string): boolean {
  return /^\[/.test(line.trim());
}

function ensureMoveTomlAddress(result: string[], worldPackageId: string, worldAddressSet: boolean): boolean {
  if (worldAddressSet) {
    return true;
  }

  const addrIdx = result.findIndex((line) => isAddressesSectionHeader(line));
  if (addrIdx !== -1) {
    result.splice(addrIdx + 1, 0, `world = "${worldPackageId}"`);
    return true;
  }

  return false;
}

function ensureMoveTomlDependency(result: string[], worldDependencySet: boolean): boolean {
  if (worldDependencySet) {
    return true;
  }

  const depIdx = result.findIndex((line) => /^\[dependencies\]/i.test(line.trim()));
  if (depIdx !== -1) {
    result.splice(depIdx + 1, 0, 'world = { local = "deps/world" }');
    return true;
  }

  return false;
}

function rewriteMoveTomlForLocalWorldDependency(moveToml: string, worldPackageId: string): string {
  const lines = moveToml.split("\n");
  const result: string[] = [];
  let inAddresses = false;
  let worldAddressSet = false;
  let worldDependencySet = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isAddressesSectionHeader(trimmed)) {
      inAddresses = true;
      result.push(line);
      continue;
    }

    if (isSectionHeader(trimmed) && !isAddressesSectionHeader(trimmed)) {
      if (inAddresses && !worldAddressSet) {
        result.push(`world = "${worldPackageId}"`);
        worldAddressSet = true;
      }
      inAddresses = false;
    }

    if (inAddresses && /^\s*world\s*=\s*"[^"]*"\s*$/.test(line)) {
      result.push(`world = "${worldPackageId}"`);
      worldAddressSet = true;
      continue;
    }

    if (/^\s*world\s*=\s*\{.*\}\s*$/.test(line)) {
      result.push('world = { local = "deps/world" }');
      worldDependencySet = true;
      continue;
    }

    result.push(line);
  }

  ensureMoveTomlAddress(result, worldPackageId, worldAddressSet);
  ensureMoveTomlDependency(result, worldDependencySet);

  return result.join("\n");
}

function getLocalDependencyDirectoryName(snapshotName: string | undefined): string {
  const normalizedName = normalizeDependencyPackageName(snapshotName ?? "dependency");
  if (normalizedName === "movestdlib") {
    return "move-stdlib";
  }

  return normalizedName.length > 0 ? normalizedName : "dependency";
}

function isWorldSnapshot(normalizedName: string): boolean {
  return normalizedName === RESOLVED_WORLD_PACKAGE_NAME;
}

function getIncludedSnapshotRelativePath(filePath: string, prefix: string): string | null {
  if (!filePath.startsWith(prefix)) {
    return null;
  }

  const relativePath = filePath.slice(prefix.length);
  return /^tests\//i.test(relativePath) ? null : relativePath;
}

function getSnapshotFileContent(input: {
  readonly content: string;
  readonly isWorldPackage: boolean;
  readonly relativePath: string;
  readonly rewritesApplied: string[];
}): string {
  if (
    input.isWorldPackage
    && /access_control\.move$/i.test(input.relativePath)
    && UNSUPPORTED_CHARACTER_TRANSFER_CHECK.test(input.content)
  ) {
    input.rewritesApplied.push(`world-source-sanitized:${input.relativePath}`);
    return input.content.replace(UNSUPPORTED_CHARACTER_TRANSFER_CHECK, COMPATIBLE_CHARACTER_TRANSFER_CHECK);
  }

  return input.content;
}

function ensureWorldManifestPresent(
  extractedFiles: Record<string, string>,
  rewritesApplied: string[],
  worldPackageId: string,
  sourceManifest?: string,
): void {
  if ("deps/world/Move.toml" in extractedFiles) {
    return;
  }

  extractedFiles["deps/world/Move.toml"] = createWorldDepMoveToml(worldPackageId, sourceManifest);
  rewritesApplied.push("world-manifest-created");
}

function getSnapshotDependencyDirectory(
  snapshot: ResolvedDependencyPackageSnapshot,
  fallbackDirectory: string,
  normalizedName: string,
): string {
  for (const filePath of Object.keys(snapshot.files ?? {})) {
    const match = filePath.match(/^dependencies\/([^/]+)\//i);
    if (match?.[1] !== undefined && normalizeDependencyPackageName(match[1]) === normalizedName) {
      return match[1];
    }
  }

  return fallbackDirectory;
}

function getSourceWorldManifest(
  snapshot: ResolvedDependencyPackageSnapshot,
  snapshotDirectory: string,
  isWorldPackage: boolean,
): string | undefined {
  if (!isWorldPackage) {
    return undefined;
  }

  const manifestPath = Object.keys(snapshot.files ?? {}).find((filePath) => new RegExp(`^dependencies/${snapshotDirectory}/Move\\.toml$`, "i").test(filePath));
  return manifestPath === undefined ? undefined : snapshot.files?.[manifestPath];
}

function materializeSnapshotFile(input: {
  readonly filePath: string;
  readonly content: string;
  readonly prefix: string;
  readonly destinationDirectory: string;
  readonly isWorldPackage: boolean;
  readonly worldPackageId: string;
  readonly rewritesApplied: string[];
}): { readonly destinationPath: string; readonly content: string; readonly rewriteApplied?: string } | null {
  const relativePath = getIncludedSnapshotRelativePath(input.filePath, input.prefix);
  if (relativePath === null) {
    return null;
  }

  const destinationPath = `deps/${input.destinationDirectory}/${relativePath}`;
  if (input.isWorldPackage && relativePath === "Move.toml") {
    return {
      destinationPath,
      content: createWorldDepMoveToml(input.worldPackageId, input.content),
      rewriteApplied: "world-manifest-rewrite",
    };
  }

  return {
    destinationPath,
    content: getSnapshotFileContent({
      content: input.content,
      isWorldPackage: input.isWorldPackage,
      relativePath,
      rewritesApplied: input.rewritesApplied,
    }),
  };
}

function extractSnapshotFiles(
  snapshot: ResolvedDependencyPackageSnapshot,
  destinationDirectory: string,
  rewritesApplied: string[],
  worldPackageId: string,
): Record<string, string> {
  const extractedFiles: Record<string, string> = {};
  const resolvedName = snapshot.name ?? "Dependency";
  const normalizedName = normalizeDependencyPackageName(resolvedName);
  const isWorldPackage = isWorldSnapshot(normalizedName);
  const snapshotDirectory = getSnapshotDependencyDirectory(snapshot, resolvedName, normalizedName);
  const prefix = `dependencies/${snapshotDirectory}/`;
  const sourceWorldManifest = getSourceWorldManifest(snapshot, snapshotDirectory, isWorldPackage);

  for (const [filePath, content] of Object.entries(snapshot.files ?? {})) {
    const materializedFile = materializeSnapshotFile({
      filePath,
      content,
      prefix,
      destinationDirectory,
      isWorldPackage,
      worldPackageId,
      rewritesApplied,
    });
    if (materializedFile === null) {
      continue;
    }

    extractedFiles[materializedFile.destinationPath] = materializedFile.content;
    if (materializedFile.rewriteApplied !== undefined) {
      rewritesApplied.push(materializedFile.rewriteApplied);
    }
  }

  if (isWorldPackage) {
    ensureWorldManifestPresent(extractedFiles, rewritesApplied, worldPackageId, sourceWorldManifest);
  }

  return extractedFiles;
}

function createMaterializedDependencyTree(
  request: DeployGradeCompileRequest,
  resolvedDependencies: ResolvedDependencies,
): MaterializedDependencyTree {
  const dependencyPackages = parseResolvedDependencyPackages(resolvedDependencies);
  if (dependencyPackages === null) {
    throw new DependencyResolutionErrorClass("Bundled dependency payloads could not be parsed for deploy-grade compilation.", {
      code: "bundled-snapshot-invalid",
      userMessage: "Bundled dependency payloads could not be parsed for deploy-grade compilation.",
      suggestedAction: "Regenerate the bundled dependency snapshots or retry deploy-grade compilation without the bundled cache.",
    });
  }

  const dependencyLinkPackageId = getDependencyLinkPackageId(request.target);
  const files: Record<string, string> = {
    "Move.toml": rewriteMoveTomlForLocalWorldDependency(request.artifact.moveToml, dependencyLinkPackageId),
  };
  const packageMap: Record<string, string> = {};
  const rewritesApplied: string[] = [];

  for (const file of request.artifact.sourceFiles ?? [{ path: request.artifact.sourceFilePath, content: request.artifact.moveSource }]) {
    if (file.path.startsWith("deps/world/")) {
      continue;
    }

    files[file.path] = file.content;
  }

  for (const snapshot of dependencyPackages) {
    const packageName = snapshot.name;
    if (packageName === undefined || snapshot.files === undefined) {
      continue;
    }

    const normalizedPackageName = normalizeDependencyPackageName(packageName);
    if (BUILT_IN_DEPENDENCY_PACKAGE_NAMES.has(normalizedPackageName)) {
      continue;
    }

    const localDirectory = getLocalDependencyDirectoryName(packageName);
    packageMap[normalizedPackageName] = `deps/${localDirectory}`;

    for (const [filePath, content] of Object.entries(extractSnapshotFiles(snapshot, localDirectory, rewritesApplied, dependencyLinkPackageId))) {
      files[filePath] = content;
    }
  }

  return {
    files,
    packageMap,
    rewritesApplied,
  };
}

function createDefaultWorldDepMoveToml(worldPackageId: string): string {
  return [
    "[package]",
    'name = "world"',
    'edition = "2024.beta"',
    `published-at = "${worldPackageId}"`,
    "",
    "[addresses]",
    `world = "${worldPackageId}"`,
    "",
  ].join("\n");
}

function flushWorldMoveTomlSections(input: {
  readonly result: string[];
  readonly inPackage: boolean;
  readonly publishedAtSet: boolean;
  readonly inAddresses: boolean;
  readonly worldAddressSet: boolean;
  readonly worldPackageId: string;
}): { readonly publishedAtSet: boolean; readonly worldAddressSet: boolean } {
  let { publishedAtSet, worldAddressSet } = input;

  if (input.inPackage && !publishedAtSet) {
    input.result.push(`published-at = "${input.worldPackageId}"`);
    publishedAtSet = true;
  }

  if (input.inAddresses && !worldAddressSet) {
    input.result.push(`world = "${input.worldPackageId}"`);
    worldAddressSet = true;
  }

  return { publishedAtSet, worldAddressSet };
}

function rewriteWorldPublishedAtLine(line: string, inPackage: boolean, worldPackageId: string): string | null {
  if (!inPackage || !/^\s*published-at\s*=\s*"[^"]*"\s*$/.test(line)) {
    return null;
  }

  return `published-at = "${worldPackageId}"`;
}

function rewriteWorldAddressLine(line: string, inAddresses: boolean, worldPackageId: string): string | null {
  if (!inAddresses || !/^\s*world\s*=\s*"[^"]*"\s*$/.test(line)) {
    return null;
  }

  return `world = "${worldPackageId}"`;
}

function rewriteWorldMoveToml(sourceMoveToml: string, worldPackageId: string): {
  readonly result: string[];
  readonly packageSectionSeen: boolean;
  readonly addressesSectionSeen: boolean;
  readonly publishedAtSet: boolean;
} {
  const result: string[] = [];
  let inPackage = false;
  let inAddresses = false;
  let packageSectionSeen = false;
  let addressesSectionSeen = false;
  let publishedAtSet = false;
  let worldAddressSet = false;

  for (const line of sourceMoveToml.split("\n")) {
    const trimmed = line.trim();

    if (isSectionHeader(trimmed)) {
      ({ publishedAtSet, worldAddressSet } = flushWorldMoveTomlSections({
        result,
        inPackage,
        publishedAtSet,
        inAddresses,
        worldAddressSet,
        worldPackageId,
      }));
      inPackage = /^\[package\]$/i.test(trimmed);
      inAddresses = isAddressesSectionHeader(trimmed);
      packageSectionSeen ||= inPackage;
      addressesSectionSeen ||= inAddresses;
      result.push(line);
      continue;
    }

    const publishedAtLine = rewriteWorldPublishedAtLine(line, inPackage, worldPackageId);
    if (publishedAtLine !== null) {
      result.push(publishedAtLine);
      publishedAtSet = true;
      continue;
    }

    const worldAddressLine = rewriteWorldAddressLine(line, inAddresses, worldPackageId);
    if (worldAddressLine !== null) {
      result.push(worldAddressLine);
      worldAddressSet = true;
      continue;
    }

    result.push(line);
  }

  ({ publishedAtSet } = flushWorldMoveTomlSections({
    result,
    inPackage,
    publishedAtSet,
    inAddresses,
    worldAddressSet,
    worldPackageId,
  }));

  return {
    result,
    packageSectionSeen,
    addressesSectionSeen,
    publishedAtSet,
  };
}

function createWorldMoveTomlWithoutPackageSection(
  result: readonly string[],
  addressesSectionSeen: boolean,
  worldPackageId: string,
): string {
  return [
    "[package]",
    'name = "world"',
    'edition = "2024.beta"',
    `published-at = "${worldPackageId}"`,
    "",
    ...result,
    ...(addressesSectionSeen ? [] : ["", "[addresses]", `world = "${worldPackageId}"`]),
    "",
  ].join("\n");
}

function ensureWorldPublishedAt(result: string[], publishedAtSet: boolean, worldPackageId: string): void {
  if (publishedAtSet) {
    return;
  }

  const packageHeaderIndex = result.findIndex((line) => /^\[package\]$/i.test(line.trim()));
  if (packageHeaderIndex !== -1) {
    result.splice(packageHeaderIndex + 1, 0, `published-at = "${worldPackageId}"`);
  }
}

function ensureWorldAddressesSection(result: string[], addressesSectionSeen: boolean, worldPackageId: string): void {
  if (!addressesSectionSeen) {
    result.push("", "[addresses]", `world = "${worldPackageId}"`);
  }
}

function createWorldDepMoveToml(worldPackageId: string, sourceMoveToml?: string): string {
  if (typeof sourceMoveToml !== "string" || sourceMoveToml.trim().length === 0) {
    return createDefaultWorldDepMoveToml(worldPackageId);
  }

  const rewritten = rewriteWorldMoveToml(sourceMoveToml, worldPackageId);
  if (!rewritten.packageSectionSeen) {
    return createWorldMoveTomlWithoutPackageSection(rewritten.result, rewritten.addressesSectionSeen, worldPackageId);
  }

  ensureWorldPublishedAt(rewritten.result, rewritten.publishedAtSet, worldPackageId);
  ensureWorldAddressesSection(rewritten.result, rewritten.addressesSectionSeen, worldPackageId);

  return rewritten.result.join("\n");
}

async function buildExtensionWithLocalWorld(
  request: DeployGradeCompileRequest,
  files: Record<string, string>,
  buildCompilerPackage: BuildMovePackageFn,
): Promise<BuildSuccessResult> {
  request.onProgress?.({ phase: "compiling" });

  let buildResult: BuildSuccessResult | BuildErrorResult;
  try {
    buildResult = await buildCompilerPackage({
      files,
      wasm: moveBuilderLiteWasmUrl,
      network: "testnet",
      silenceWarnings: false,
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

  return buildResult;
}

function createWorldOnlyFileMap(localFiles: Record<string, string>): Record<string, string> {
  const worldOnlyFiles: Record<string, string> = {};

  for (const [path, content] of Object.entries(localFiles)) {
    if (path.startsWith("deps/world/")) {
      worldOnlyFiles[path.replace("deps/world/", "")] = content;
    }
  }

  return worldOnlyFiles;
}

async function detectWorldModuleSet(
  worldOnlyFiles: Record<string, string>,
  buildCompilerPackage: BuildMovePackageFn,
): Promise<ReadonlySet<string> | null> {
  try {
    const worldOnlyResult = await buildCompilerPackage({
      files: worldOnlyFiles,
      wasm: moveBuilderLiteWasmUrl,
      network: "testnet",
      silenceWarnings: true,
    }) as BuildSuccessResult | BuildErrorResult;

    return "modules" in worldOnlyResult ? new Set(worldOnlyResult.modules) : null;
  } catch {
    return null;
  }
}

function selectExtensionModules(input: {
  readonly request: DeployGradeCompileRequest;
  readonly localFiles: Record<string, string>;
  readonly packageMap: Readonly<Record<string, string>>;
  readonly rewritesApplied: readonly string[];
  readonly worldOnlyFiles: Record<string, string>;
  readonly buildModules: readonly string[];
  readonly worldModuleSet: ReadonlySet<string> | null;
}): readonly string[] {
  const worldModuleSet = input.worldModuleSet;
  const filteredModules = worldModuleSet !== null
    ? input.buildModules.filter((moduleBytes) => !worldModuleSet.has(moduleBytes))
    : input.buildModules;
  const fallbackApplied = worldModuleSet !== null
    && input.buildModules.length > 0
    && filteredModules.length === 0;

  reportDeployGradeModuleSetDiagnostics({
    targetId: input.request.target.targetId,
    targetWorldPackageId: input.request.target.worldPackageId,
    sourceVersionTag: input.request.worldSource.sourceVersionTag,
    packageMap: input.packageMap,
    rewritesApplied: input.rewritesApplied,
    localFileCount: Object.keys(input.localFiles).length,
    localFileKeys: Object.keys(input.localFiles).sort(),
    worldOnlyFileCount: Object.keys(input.worldOnlyFiles).length,
    worldOnlyFileKeys: Object.keys(input.worldOnlyFiles).sort(),
    rootMoveToml: input.localFiles["Move.toml"] ?? null,
    worldMoveToml: input.localFiles["deps/world/Move.toml"] ?? null,
    fullBuildModules: input.buildModules,
    worldOnlyModules: worldModuleSet === null ? null : Array.from(worldModuleSet),
    filteredModules,
    fallbackApplied,
  });

  return fallbackApplied ? input.buildModules : filteredModules;
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
  const cacheKey = getResolutionCacheKey(request.target.targetId, request.worldSource.sourceVersionTag);
  const rootGit = createRootGit(request.worldSource.sourceVersionTag);

  await verifyIntegrity();
  await initCompiler({ wasm: moveBuilderLiteWasmUrl });

  // Step 1: Resolve dependencies to obtain world source files
  const gitFiles = createFileMap(request);
  const resolvedDependencies = await resolveDeployDependencies({ request, files: gitFiles, rootGit, cacheKey, resolve: resolveCompilerDependencies, now });
  const sanitizedDependencies = sanitizeResolvedDependencies(resolvedDependencies);

  // Step 2: Materialize the dependency tree from cached/resolved package payloads.
  const materializedDependencyTree = createMaterializedDependencyTree(request, sanitizedDependencies);
  const localFiles = materializedDependencyTree.files;

  const buildResult = await buildExtensionWithLocalWorld(request, localFiles, buildCompilerPackage);
  const worldOnlyFiles = createWorldOnlyFileMap(localFiles);
  const worldModuleSet = await detectWorldModuleSet(worldOnlyFiles, buildCompilerPackage);
  const extensionModules = selectExtensionModules({
    request,
    localFiles,
    packageMap: materializedDependencyTree.packageMap,
    rewritesApplied: materializedDependencyTree.rewritesApplied,
    worldOnlyFiles,
    buildModules: buildResult.modules,
    worldModuleSet,
  });

  request.onProgress?.({ phase: "complete" });

  return {
    modules: extensionModules.map((moduleBytes) => decodeBase64(moduleBytes)),
    dependencies: buildResult.dependencies,
    digest: buildResult.digest,
    resolvedDependencies: sanitizedDependencies,
    targetId: request.target.targetId,
    sourceVersionTag: request.worldSource.sourceVersionTag,
    builderToolchainVersion: await getCompilerVersion({ wasm: moveBuilderLiteWasmUrl }),
    compiledAt: now(),
  };
}