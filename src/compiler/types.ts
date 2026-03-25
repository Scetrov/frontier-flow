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
  readonly targetId: Exclude<DeploymentTargetId, "local">;
  readonly environmentLabel: string;
  readonly worldPackageId: string;
  readonly objectRegistryId: string;
  readonly serverAddressRegistryId: string;
  readonly source: string;
  readonly lastVerifiedOn: string;
}

export type DeploymentStatusType = "blocked" | "ready" | "deployed";
export type DeploymentAttemptOutcome = "blocked" | "cancelled" | "failed" | "unresolved" | "succeeded";
export type DeploymentStage = "validating" | "preparing" | "signing" | "submitting" | "confirming";
export type DeploymentMessageSeverity = "info" | "warning" | "error" | "success";

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