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

export interface GeneratedContractArtifact {
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
  validate(node: IRNode): ValidationResult;
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
  readonly triggerCompile: () => void;
}

export interface PipelineInput {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly moduleName: string;
  readonly signal?: AbortSignal;
}