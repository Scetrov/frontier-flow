import type { FlowEdge, FlowNode, NodeCategory, NodeFieldMap, SocketDefinition, SocketType } from "../types/nodes";

export interface IRConnection {
  readonly sourceNodeId: string;
  readonly sourceSocketId: string;
  readonly targetNodeId: string;
  readonly targetSocketId: string;
  readonly socketType: SocketType;
}

export interface IRNode {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly category: NodeCategory;
  readonly fields: NodeFieldMap;
  readonly inputs: Readonly<Partial<Record<string, IRConnection>>>;
  readonly outputs: Readonly<Partial<Record<string, readonly IRConnection[]>>>;
  readonly sockets: readonly SocketDefinition[];
  readonly estimatedGas?: number;
  readonly pruned?: boolean;
}

export interface IRGraph {
  readonly nodes: ReadonlyMap<string, IRNode>;
  readonly connections: readonly IRConnection[];
  readonly executionOrder: readonly string[];
  readonly moduleName: string;
  readonly requestedModuleName: string;
  readonly disconnectedNodeIds: readonly string[];
  readonly unresolvedNodeIds: readonly string[];
}

export interface SourceMapEntry {
  readonly line: number;
  readonly astNodeId: string;
  readonly reactFlowNodeId: string;
  readonly context?: string;
}

export type DeploymentTargetId = "local" | "testnet:stillness" | "testnet:utopia";

export interface DeploymentTarget {
  readonly id: DeploymentTargetId;
  readonly label: string;
  readonly networkFamily: "local" | "testnet";
  readonly requiresPublishedPackageRefs: boolean;
  readonly supportsWalletSigning: boolean;
  readonly rpcUrl: string;
  readonly requiresLocalValidator: boolean;
}

export interface PackageReferenceBundle {
  readonly targetId: DeploymentTargetId;
  readonly environmentLabel: string;
  readonly worldPackageId: string;
  readonly originalWorldPackageId: string;
  readonly objectRegistryId: string;
  readonly serverAddressRegistryId: string;
  readonly sourceVersionTag: string;
  readonly toolchainVersion: string;
  readonly source: string;
  readonly lastVerifiedOn: string;
}

export interface ResolvedDependencies {
  readonly files: string;
  readonly dependencies: string;
  readonly lockfileDependencies: string;
}

export interface ResolvedDependencyPackageSnapshot {
  readonly name?: string;
  readonly files?: Readonly<Record<string, string>>;
}

export interface BundledDependencySnapshot {
  readonly sourceVersionTag: string;
  readonly resolvedAt: number;
  readonly resolvedDependencies: ResolvedDependencies;
}

export interface SnapshotValidationResult {
  readonly isValid: boolean;
  readonly missingPackages: readonly string[];
  readonly emptyPackageNames: readonly string[];
  readonly fallbackAllowed: boolean;
  readonly message: string;
}

export interface MaterializedDependencyTree {
  readonly files: Readonly<Record<string, string>>;
  readonly packageMap: Readonly<Record<string, string>>;
  readonly rewritesApplied: readonly string[];
}

export interface ResolvedWorldSource {
  readonly sourceVersionTag: string;
  readonly files: Readonly<Record<string, string>>;
  readonly fetchedAt: number;
}

export interface CachedDependencyResolution {
  readonly targetId: DeploymentTargetId;
  readonly sourceVersionTag: string;
  readonly resolvedDependencies: ResolvedDependencies;
  readonly resolvedAt: number;
}

export interface FetchWorldSourceRequest {
  readonly repositoryUrl: string;
  readonly versionTag: string;
  readonly subdirectory: string;
  readonly signal?: AbortSignal;
}

export type FetchWorldSourceResult = ResolvedWorldSource;

export type DeployCompileProgressEvent =
  | { readonly phase: "fetching-source" }
  | {
      readonly phase: "resolving-dependencies";
      readonly current: number;
      readonly total: number;
    }
  | { readonly phase: "compiling" }
  | { readonly phase: "complete" };

export interface DeployGradeCompileRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly worldSource: FetchWorldSourceResult;
  readonly target: PackageReferenceBundle;
  readonly cachedResolution?: CachedDependencyResolution;
  readonly onProgress?: (event: DeployCompileProgressEvent) => void;
  readonly signal?: AbortSignal;
}

export interface DeployGradeCompileResult {
  readonly modules: readonly Uint8Array[];
  readonly dependencies: readonly string[];
  readonly digest: readonly number[];
  readonly resolvedDependencies: ResolvedDependencies;
  readonly targetId: DeploymentTargetId;
  readonly sourceVersionTag: string;
  readonly builderToolchainVersion: string;
  readonly compiledAt: number;
}

export interface TurretAuthorizationState {
  readonly turretId: string;
  readonly status: "pending" | "submitting" | "confirming" | "confirmed" | "failed";
  readonly transactionDigest?: string;
  readonly error?: string;
}

interface DeployGradeErrorOptions {
  readonly code: string;
  readonly userMessage: string;
  readonly suggestedAction?: string;
  readonly cause?: unknown;
}

class DeployGradeError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly suggestedAction?: string;

  constructor(message: string, options: DeployGradeErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.suggestedAction = options.suggestedAction;
  }
}

export class DependencyResolutionError extends DeployGradeError {
  constructor(message: string, options: Omit<DeployGradeErrorOptions, "code"> & { readonly code?: string }) {
    super(message, {
      ...options,
      code: options.code ?? "dependency-resolution-failed",
    });
  }
}

export class DeployCompilationError extends DeployGradeError {
  constructor(message: string, options: Omit<DeployGradeErrorOptions, "code"> & { readonly code?: string }) {
    super(message, {
      ...options,
      code: options.code ?? "deploy-compilation-failed",
    });
  }
}

export class ToolchainMismatchWarning extends DeployGradeError {
  readonly expectedVersion: string;
  readonly actualVersion: string;

  constructor(message: string, input: {
    readonly expectedVersion: string;
    readonly actualVersion: string;
    readonly userMessage: string;
    readonly suggestedAction?: string;
  }) {
    super(message, {
      code: "toolchain-mismatch",
      userMessage: input.userMessage,
      suggestedAction: input.suggestedAction,
    });
    this.expectedVersion = input.expectedVersion;
    this.actualVersion = input.actualVersion;
  }
}

export type DeploymentStatusType = "blocked" | "ready" | "deployed";
export type DeploymentAttemptOutcome = "blocked" | "cancelled" | "failed" | "unresolved" | "succeeded";
export type DeploymentStage =
  | "validating"
  | "preparing"
  | "fetch-world-source"
  | "resolve-dependencies"
  | "deploy-grade-compile"
  | "signing"
  | "submitting"
  | "confirming";
export type DeploymentMessageSeverity = "info" | "warning" | "error" | "success";

export interface PublishPayloadReadinessResult {
  readonly ready: boolean;
  readonly stage: DeploymentStage;
  readonly message: string;
  readonly remediation: string;
  readonly errorCode?: "publish-payload-empty";
}

export class PublishPayloadEmptyError extends Error {
  readonly code = "publish-payload-empty" as const;
  readonly stage: DeploymentStage;
  readonly remediation: string;

  constructor(input: PublishPayloadReadinessResult) {
    super(input.message);
    this.name = "PublishPayloadEmptyError";
    this.stage = input.stage;
    this.remediation = input.remediation;
  }
}

export interface ContractIdentity {
  readonly packageName: string;
  readonly moduleName: string;
  readonly requestedModuleName: string;
}

export interface GeneratedSourceFile {
  readonly path: string;
  readonly content: string;
}

export interface ArtifactManifest {
  readonly moveToml: string;
  readonly dependencies: readonly string[];
}

export interface ContractSectionTrace {
  readonly id: string;
  readonly label: string;
  readonly nodeIds: readonly string[];
  readonly lineStart: number;
  readonly lineEnd: number;
}

export interface CompileReadiness {
  readonly ready: boolean;
  readonly blockedReasons: readonly string[];
  readonly nextActionSummary: string;
}

export interface DeploymentStatus {
  readonly artifactId: string;
  readonly status: DeploymentStatusType;
  readonly outcome?: DeploymentAttemptOutcome;
  readonly targetId?: DeploymentTargetId;
  readonly packageId?: string;
  readonly confirmationReference?: string;
  readonly stage?: DeploymentStage;
  readonly severity?: DeploymentMessageSeverity;
  readonly headline?: string;
  readonly targetMode: "existing-turret";
  readonly requiredInputs: readonly string[];
  readonly resolvedInputs: readonly string[];
  readonly blockedReasons: readonly string[];
  readonly nextActionSummary: string;
  readonly reviewHistory?: readonly DeploymentReviewEntry[];
}

export interface DeploymentAttempt {
  readonly attemptId: string;
  readonly artifactId: string;
  readonly targetId: DeploymentTargetId;
  readonly moduleName?: string;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly outcome: DeploymentAttemptOutcome;
  readonly currentStage: DeploymentStage;
  readonly packageId?: string;
  readonly confirmationReference?: string;
  readonly sourceVersionTag?: string;
  readonly builderToolchainVersion?: string;
  readonly message: string;
  readonly errorCode?: string;
}

export interface DeploymentProgress {
  readonly attemptId: string;
  readonly targetId: DeploymentTargetId;
  readonly stage: DeploymentStage;
  readonly stageIndex: number;
  readonly stageCount: number;
  readonly completedStages: readonly DeploymentStage[];
  readonly activeMessage: string;
  readonly dismissedByUser: boolean;
}

export interface DeploymentStatusMessage {
  readonly attemptId: string;
  readonly targetId: DeploymentTargetId;
  readonly severity: DeploymentMessageSeverity;
  readonly headline: string;
  readonly details: string;
  readonly stage?: DeploymentStage;
  readonly packageId?: string;
  readonly confirmationReference?: string;
  readonly visibleInFooter: boolean;
  readonly visibleInMovePanel: boolean;
}

export interface DeploymentReviewEntry {
  readonly attemptId: string;
  readonly artifactId: string;
  readonly headline: string;
  readonly targetId: DeploymentTargetId;
  readonly outcome: DeploymentAttemptOutcome;
  readonly severity: DeploymentMessageSeverity;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly stage?: DeploymentStage;
  readonly packageId?: string;
  readonly confirmationReference?: string;
  readonly details: string;
  readonly blockedReasons: readonly string[];
  readonly historicalOnly?: boolean;
  readonly historicalReason?: string;
}

export interface GeneratedContractArtifact {
  readonly artifactId?: string;
  readonly sourceDagId?: string;
  readonly contractIdentity?: ContractIdentity;
  readonly sourceFiles?: readonly GeneratedSourceFile[];
  readonly manifest?: ArtifactManifest;
  readonly traceSections?: readonly ContractSectionTrace[];
  readonly diagnostics?: readonly CompilerDiagnostic[];
  readonly compileReadiness?: CompileReadiness;
  readonly deploymentStatus?: DeploymentStatus;
  readonly moduleName: string;
  readonly sourceFilePath: string;
  readonly moveToml: string;
  readonly moveSource: string;
  readonly sourceMap: readonly SourceMapEntry[];
  readonly dependencies: readonly string[];
  readonly bytecodeModules: readonly Uint8Array[];
}

export interface AnnotatedLine {
  readonly code: string;
  readonly nodeId: string;
  readonly indent: number;
}

export interface EmitterOutput {
  readonly code: string;
  readonly moveToml: string;
  readonly sourceMap: readonly SourceMapEntry[];
  readonly artifact: GeneratedContractArtifact;
}

export interface CompilerDiagnostic {
  readonly severity: "error" | "warning";
  readonly stage?: "validation" | "sanitization" | "emission" | "compilation";
  readonly rawMessage: string;
  readonly line: number | null;
  readonly reactFlowNodeId: string | null;
  readonly socketId: string | null;
  readonly userMessage: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

export type CompilationStatus =
  | { readonly state: "idle" }
  | { readonly state: "compiling" }
  | {
      readonly state: "compiled";
      readonly bytecode: readonly Uint8Array[];
      readonly artifact?: GeneratedContractArtifact;
    }
  | {
      readonly state: "error";
      readonly diagnostics: readonly CompilerDiagnostic[];
      readonly artifact?: GeneratedContractArtifact;
    };

export interface GenerationContext {
  readonly imports: Set<string>;
  readonly bindings: Map<string, string>;
  readonly graph?: IRGraph;
  readonly structs: string[];
  readonly entryFunctions: string[];
  readonly moduleName: string;
  readonly sourceMap: SourceMapEntry[];
  currentLine: number;
}

export interface NodeCodeGenerator {
  readonly nodeType: string;
  validate(node: IRNode, graph: IRGraph): ValidationResult;
  emit(node: IRNode, context: GenerationContext): readonly AnnotatedLine[];
}

export interface OptimizationRewrite {
  readonly nodeId: string;
  readonly pass: string;
  readonly description: string;
}

export interface OptimizationReport {
  readonly originalNodeCount: number;
  readonly optimizedNodeCount: number;
  readonly nodesRemoved: readonly string[];
  readonly nodesRewritten: readonly OptimizationRewrite[];
  readonly gasBefore: number;
  readonly gasAfter: number;
}

export interface CompileResult {
  readonly success: boolean;
  readonly modules: readonly Uint8Array[] | null;
  readonly dependencies: readonly string[] | null;
  readonly errors: readonly CompilerDiagnostic[] | null;
  readonly warnings: readonly CompilerDiagnostic[];
  readonly artifact: GeneratedContractArtifact | null;
}

export interface PipelineResult {
  readonly status: CompilationStatus;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly code: string | null;
  readonly sourceMap: readonly SourceMapEntry[] | null;
  readonly optimizationReport: OptimizationReport | null;
  readonly artifact: GeneratedContractArtifact | null;
}

export interface CompilationState {
  readonly status: CompilationStatus;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly sourceCode: string | null;
  readonly artifact: GeneratedContractArtifact | null;
  readonly hasSettledGraph: boolean;
  readonly triggerCompile: () => void;
}

export interface DeploymentState {
  readonly selectedTarget: DeploymentTargetId;
  readonly canDeploy: boolean;
  readonly isDeploying: boolean;
  readonly isProgressModalOpen: boolean;
  readonly blockerReasons: readonly string[];
  readonly requiredInputs: readonly string[];
  readonly resolvedInputs: readonly string[];
  readonly deploymentStatus: DeploymentStatus | null;
  readonly latestAttempt: DeploymentAttempt | null;
  readonly progress: DeploymentProgress | null;
  readonly statusMessage: DeploymentStatusMessage | null;
  readonly setSelectedTarget: (target: DeploymentTargetId) => void;
  readonly startDeployment: () => Promise<void>;
  readonly dismissProgress: () => void;
}

export interface PipelineInput {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly moduleName: string;
  readonly signal?: AbortSignal;
}