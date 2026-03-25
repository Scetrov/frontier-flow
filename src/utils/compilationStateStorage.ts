import type {
  CompilationStatus,
  CompileReadiness,
  CompilerDiagnostic,
  ContractIdentity,
  ContractSectionTrace,
  GeneratedContractArtifact,
  GeneratedSourceFile,
  SourceMapEntry,
} from "../compiler/types";

export const COMPILATION_STATE_STORAGE_KEY = "frontier-flow:compilation-state";

export interface PersistedCompilationState {
  readonly version: 1;
  readonly graphKey: string;
  readonly status: CompilationStatus;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly moveSourceCode: string | null;
}

interface StoredArtifactManifest {
  readonly moveToml: string;
  readonly dependencies: readonly string[];
}

interface StoredGeneratedContractArtifact {
  readonly artifactId?: string;
  readonly sourceDagId?: string;
  readonly contractIdentity?: ContractIdentity;
  readonly sourceFiles?: readonly GeneratedSourceFile[];
  readonly manifest?: StoredArtifactManifest;
  readonly traceSections?: readonly ContractSectionTrace[];
  readonly diagnostics?: readonly CompilerDiagnostic[];
  readonly compileReadiness?: CompileReadiness;
  readonly moduleName: string;
  readonly sourceFilePath: string;
  readonly moveToml: string;
  readonly moveSource: string;
  readonly sourceMap: readonly SourceMapEntry[];
  readonly dependencies: readonly string[];
  readonly bytecodeModules: readonly number[][];
}

interface StoredCompiledStatus {
  readonly state: "compiled";
  readonly bytecode: readonly number[][];
  readonly artifact?: StoredGeneratedContractArtifact;
}

interface StoredErrorStatus {
  readonly state: "error";
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly artifact?: StoredGeneratedContractArtifact;
}

type StoredCompilationStatus = StoredCompiledStatus | StoredErrorStatus;

/**
 * Loads the last settled compilation snapshot from local storage.
 */
export function loadCompilationState(storage: Storage | undefined): PersistedCompilationState | null {
  const rawValue = storage?.getItem(COMPILATION_STATE_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return parsePersistedCompilationState(parsedValue);
  } catch {
    return null;
  }
}

/**
 * Persists the latest settled compilation snapshot to local storage.
 */
export function saveCompilationState(storage: Storage | undefined, state: PersistedCompilationState): void {
  storage?.setItem(COMPILATION_STATE_STORAGE_KEY, JSON.stringify(serializePersistedCompilationState(state)));
}

function serializePersistedCompilationState(state: PersistedCompilationState) {
  return {
    version: 1,
    graphKey: state.graphKey,
    status: serializeCompilationStatus(state.status),
    diagnostics: state.diagnostics,
    moveSourceCode: state.moveSourceCode,
  };
}

function serializeCompilationStatus(status: CompilationStatus): StoredCompilationStatus {
  switch (status.state) {
    case "compiled":
      return {
        state: "compiled",
        bytecode: serializeBytecodeModules(status.bytecode),
        artifact: status.artifact === undefined ? undefined : serializeArtifact(status.artifact),
      };
    case "error":
      return {
        state: "error",
        diagnostics: status.diagnostics,
        artifact: status.artifact === undefined ? undefined : serializeArtifact(status.artifact),
      };
    case "idle":
    case "compiling":
      throw new Error(`Cannot persist non-settled compilation state: ${status.state}`);
  }
}

function serializeArtifact(artifact: GeneratedContractArtifact): StoredGeneratedContractArtifact {
  return {
    artifactId: artifact.artifactId,
    sourceDagId: artifact.sourceDagId,
    contractIdentity: artifact.contractIdentity,
    sourceFiles: artifact.sourceFiles,
    manifest: artifact.manifest,
    traceSections: artifact.traceSections,
    diagnostics: artifact.diagnostics,
    compileReadiness: artifact.compileReadiness,
    moduleName: artifact.moduleName,
    sourceFilePath: artifact.sourceFilePath,
    moveToml: artifact.moveToml,
    moveSource: artifact.moveSource,
    sourceMap: artifact.sourceMap,
    dependencies: artifact.dependencies,
    bytecodeModules: serializeBytecodeModules(artifact.bytecodeModules),
  };
}

function serializeBytecodeModules(bytecodeModules: readonly Uint8Array[]): readonly number[][] {
  return bytecodeModules.map((module) => [...module]);
}

function parsePersistedCompilationState(value: unknown): PersistedCompilationState | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.graphKey !== "string") {
    return null;
  }

  const status = parseCompilationStatus(value.status);
  const diagnostics = parseDiagnostics(value.diagnostics);
  const moveSourceCode = typeof value.moveSourceCode === "string" || value.moveSourceCode === null
    ? value.moveSourceCode
    : null;

  if (status === null || diagnostics === null) {
    return null;
  }

  return {
    version: 1,
    graphKey: value.graphKey,
    status,
    diagnostics,
    moveSourceCode,
  };
}

function parseCompiledStatus(value: Record<string, unknown>): CompilationStatus | null {
  const bytecode = parseBytecodeModules(value.bytecode);
  const artifact = value.artifact === undefined ? undefined : parseArtifact(value.artifact);
  if (bytecode === null || artifact === null) {
    return null;
  }

  return { state: "compiled", bytecode, artifact };
}

function parseErrorStatus(value: Record<string, unknown>): CompilationStatus | null {
  const diagnostics = parseDiagnostics(value.diagnostics);
  const artifact = value.artifact === undefined ? undefined : parseArtifact(value.artifact);
  if (diagnostics === null || artifact === null) {
    return null;
  }

  return { state: "error", diagnostics, artifact };
}

function parseCompilationStatus(value: unknown): CompilationStatus | null {
  if (!isRecord(value) || typeof value.state !== "string") {
    return null;
  }

  if (value.state === "compiled") {
    return parseCompiledStatus(value);
  }

  if (value.state === "error") {
    return parseErrorStatus(value);
  }

  return null;
}

function parseArtifactRequiredFields(value: Record<string, unknown>): {
  readonly moduleName: string;
  readonly sourceFilePath: string;
  readonly moveToml: string;
  readonly moveSource: string;
  readonly sourceMap: readonly SourceMapEntry[];
  readonly dependencies: readonly string[];
  readonly bytecodeModules: readonly Uint8Array[];
} | null {
  const sourceMap = parseSourceMapEntries(value.sourceMap);
  const dependencies = parseStringArray(value.dependencies);
  const bytecodeModules = parseBytecodeModules(value.bytecodeModules);
  if (
    typeof value.moduleName !== "string"
    || typeof value.sourceFilePath !== "string"
    || typeof value.moveToml !== "string"
    || typeof value.moveSource !== "string"
    || sourceMap === null
    || dependencies === null
    || bytecodeModules === null
  ) {
    return null;
  }

  return {
    moduleName: value.moduleName,
    sourceFilePath: value.sourceFilePath,
    moveToml: value.moveToml,
    moveSource: value.moveSource,
    sourceMap,
    dependencies,
    bytecodeModules,
  };
}

function parseOptionalField<T>(value: unknown, parser: (v: unknown) => T | null): T | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  return parser(value);
}

function parseArtifactOptionalFields(value: Record<string, unknown>): {
  readonly contractIdentity: ContractIdentity | undefined;
  readonly sourceFiles: readonly GeneratedSourceFile[] | undefined;
  readonly manifest: StoredArtifactManifest | undefined;
  readonly traceSections: readonly ContractSectionTrace[] | undefined;
  readonly diagnostics: readonly CompilerDiagnostic[] | undefined;
  readonly compileReadiness: CompileReadiness | undefined;
} | null {
  const contractIdentity = parseOptionalField(value.contractIdentity, parseContractIdentity);
  if (contractIdentity === null) return null;

  const sourceFiles = parseOptionalField(value.sourceFiles, parseGeneratedSourceFiles);
  if (sourceFiles === null) return null;

  const manifest = parseOptionalField(value.manifest, parseArtifactManifest);
  if (manifest === null) return null;

  const traceSections = parseOptionalField(value.traceSections, parseTraceSections);
  if (traceSections === null) return null;

  const diagnostics = parseOptionalField(value.diagnostics, parseDiagnostics);
  if (diagnostics === null) return null;

  const compileReadiness = parseOptionalField(value.compileReadiness, parseCompileReadiness);
  if (compileReadiness === null) return null;

  return { contractIdentity, sourceFiles, manifest, traceSections, diagnostics, compileReadiness };
}

function parseArtifact(value: unknown): GeneratedContractArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  const required = parseArtifactRequiredFields(value);
  const optional = required !== null ? parseArtifactOptionalFields(value) : null;
  if (required === null || optional === null) {
    return null;
  }

  return {
    artifactId: typeof value.artifactId === "string" ? value.artifactId : undefined,
    sourceDagId: typeof value.sourceDagId === "string" ? value.sourceDagId : undefined,
    ...optional,
    ...required,
  };
}

function parseContractIdentity(value: unknown): ContractIdentity | null {
  if (
    !isRecord(value)
    || typeof value.packageName !== "string"
    || typeof value.moduleName !== "string"
    || typeof value.requestedModuleName !== "string"
  ) {
    return null;
  }

  return {
    packageName: value.packageName,
    moduleName: value.moduleName,
    requestedModuleName: value.requestedModuleName,
  };
}

function parseGeneratedSourceFiles(value: unknown): readonly GeneratedSourceFile[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const sourceFiles: GeneratedSourceFile[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.path !== "string" || typeof entry.content !== "string") {
      return null;
    }

    sourceFiles.push({ path: entry.path, content: entry.content });
  }

  return sourceFiles;
}

function parseArtifactManifest(value: unknown): StoredArtifactManifest | null {
  if (!isRecord(value) || typeof value.moveToml !== "string") {
    return null;
  }

  const dependencies = parseStringArray(value.dependencies);
  if (dependencies === null) {
    return null;
  }

  return {
    moveToml: value.moveToml,
    dependencies,
  };
}

function parseTraceSections(value: unknown): readonly ContractSectionTrace[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const traceSections: ContractSectionTrace[] = [];
  for (const entry of value) {
    const nodeIds = isRecord(entry) ? parseStringArray(entry.nodeIds) : null;
    if (
      !isRecord(entry)
      || typeof entry.id !== "string"
      || typeof entry.label !== "string"
      || nodeIds === null
      || !isFiniteNumber(entry.lineStart)
      || !isFiniteNumber(entry.lineEnd)
    ) {
      return null;
    }

    traceSections.push({
      id: entry.id,
      label: entry.label,
      nodeIds,
      lineStart: entry.lineStart,
      lineEnd: entry.lineEnd,
    });
  }

  return traceSections;
}

function parseCompileReadiness(value: unknown): CompileReadiness | null {
  if (!isRecord(value) || typeof value.ready !== "boolean" || typeof value.nextActionSummary !== "string") {
    return null;
  }

  const blockedReasons = parseStringArray(value.blockedReasons);
  if (blockedReasons === null) {
    return null;
  }

  return {
    ready: value.ready,
    blockedReasons,
    nextActionSummary: value.nextActionSummary,
  };
}

function parseSourceMapEntries(value: unknown): readonly SourceMapEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const entries: SourceMapEntry[] = [];
  for (const entry of value) {
    if (
      !isRecord(entry)
      || !isFiniteNumber(entry.line)
      || typeof entry.astNodeId !== "string"
      || typeof entry.reactFlowNodeId !== "string"
      || (entry.context !== undefined && typeof entry.context !== "string")
    ) {
      return null;
    }

    entries.push({
      line: entry.line,
      astNodeId: entry.astNodeId,
      reactFlowNodeId: entry.reactFlowNodeId,
      context: typeof entry.context === "string" ? entry.context : undefined,
    });
  }

  return entries;
}

function isValidDiagnosticSeverity(value: unknown): value is "error" | "warning" {
  return value === "error" || value === "warning";
}

function isValidDiagnosticStage(value: unknown): value is "validation" | "sanitization" | "emission" | "compilation" | undefined {
  return value === undefined || value === "validation" || value === "sanitization" || value === "emission" || value === "compilation";
}

function isNullOrString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullOrFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function parseSingleDiagnostic(entry: unknown): CompilerDiagnostic | null {
  if (
    !isRecord(entry)
    || !isValidDiagnosticSeverity(entry.severity)
    || !isValidDiagnosticStage(entry.stage)
    || typeof entry.rawMessage !== "string"
    || !isNullOrFiniteNumber(entry.line)
    || !isNullOrString(entry.reactFlowNodeId)
    || !isNullOrString(entry.socketId)
    || typeof entry.userMessage !== "string"
  ) {
    return null;
  }

  return {
    severity: entry.severity,
    stage: entry.stage,
    rawMessage: entry.rawMessage,
    line: entry.line,
    reactFlowNodeId: entry.reactFlowNodeId,
    socketId: entry.socketId,
    userMessage: entry.userMessage,
  };
}

function parseDiagnostics(value: unknown): readonly CompilerDiagnostic[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const diagnostics: CompilerDiagnostic[] = [];
  for (const entry of value) {
    const diagnostic = parseSingleDiagnostic(entry);
    if (diagnostic === null) {
      return null;
    }

    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

function parseBytecodeModules(value: unknown): readonly Uint8Array[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const modules: Uint8Array[] = [];
  for (const entry of value) {
    if (!Array.isArray(entry)) {
      return null;
    }

    const bytes: number[] = [];
    for (const byte of entry) {
      if (!isByte(byte)) {
        return null;
      }

      bytes.push(byte);
    }

    modules.push(new Uint8Array(bytes));
  }

  return modules;
}

function parseStringArray(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      return null;
    }

    strings.push(entry);
  }

  return strings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isByte(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}