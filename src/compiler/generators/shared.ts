import type {
  AnnotatedLine,
  GeneratedContractArtifact,
  GeneratedSourceFile,
  GenerationContext,
  IRNode,
  SourceMapEntry,
  ValidationResult,
} from "../types";

import { createArtifactId, sortUniqueStrings } from "../determinism";

export const GENERATED_ARTIFACT_SOURCE_DIR = "sources";

interface GeneratedContractArtifactInput {
  readonly moduleName: string;
  readonly requestedModuleName: string;
  readonly moveToml: string;
  readonly moveSource: string;
  readonly sourceMap: readonly SourceMapEntry[];
  readonly sourceFiles?: readonly GeneratedSourceFile[];
}

export function createGeneratedSourceFilePath(moduleName: string): string {
  return `${GENERATED_ARTIFACT_SOURCE_DIR}/${moduleName}.move`;
}

export function createGeneratedContractArtifact({
  moduleName,
  requestedModuleName,
  moveToml,
  moveSource,
  sourceMap,
  sourceFiles,
}: GeneratedContractArtifactInput): GeneratedContractArtifact {
  const sourceFilePath = createGeneratedSourceFilePath(moduleName);
  const artifactId = createArtifactId(moduleName, requestedModuleName, moveToml, moveSource);
  const traceNodeIds = sortUniqueStrings(sourceMap.map((entry) => entry.reactFlowNodeId));
  const firstTraceLine = sourceMap.length === 0 ? 1 : sourceMap[0].line;
  const lastTraceLine = sourceMap.length === 0 ? 1 : sourceMap[sourceMap.length - 1].line;

  return {
    artifactId,
    sourceDagId: requestedModuleName,
    contractIdentity: {
      packageName: moduleName,
      moduleName,
      requestedModuleName,
    },
    sourceFiles: sourceFiles ?? [{ path: sourceFilePath, content: moveSource }],
    manifest: {
      moveToml,
      dependencies: [],
    },
    traceSections: sourceMap.length === 0
      ? []
      : [{
          id: "get_target_priority_list",
          label: "get_target_priority_list",
          nodeIds: traceNodeIds,
          lineStart: firstTraceLine,
          lineEnd: lastTraceLine,
        }],
    diagnostics: [],
    compileReadiness: {
      ready: true,
      blockedReasons: [],
      nextActionSummary: "Build the generated package to verify bytecode and preserve the artifact for downstream workflows.",
    },
    deploymentStatus: {
      artifactId,
      status: "blocked",
      targetMode: "existing-turret",
      requiredInputs: ["compiled bytecode artifact", "selected deployment target", "target prerequisites"],
      resolvedInputs: ["generated contract artifact"],
      blockedReasons: ["Compile the generated package to produce deployable bytecode for the selected target."],
      nextActionSummary: "Build the generated package, choose a deployment target, and satisfy the target prerequisites before deploying.",
    },
    moduleName,
    sourceFilePath,
    moveToml,
    moveSource,
    sourceMap,
    dependencies: [],
    bytecodeModules: [],
  };
}

export function attachCompiledArtifactResult(
  artifact: GeneratedContractArtifact,
  bytecodeModules: readonly Uint8Array[],
  dependencies: readonly string[],
): GeneratedContractArtifact {
  const existingDeploymentStatus = artifact.deploymentStatus;
  const deploymentStatus = existingDeploymentStatus === undefined
    ? undefined
    : {
        ...existingDeploymentStatus,
        blockedReasons: ["Select a deployment target and validate the target prerequisites before deploying."],
        nextActionSummary: "Select a deployment target and validate the wallet or local-environment prerequisites before deploying.",
      };

  return {
    ...artifact,
    manifest: {
      moveToml: artifact.moveToml,
      dependencies,
    },
    compileReadiness: {
      ready: true,
      blockedReasons: [],
      nextActionSummary: "Compiled artifact is ready for preview, verification, and existing-turret deployment handoff.",
    },
    deploymentStatus,
    bytecodeModules,
    dependencies,
  };
}

export function attachArtifactDiagnostics(
  artifact: GeneratedContractArtifact,
  diagnostics: GeneratedContractArtifact["diagnostics"],
): GeneratedContractArtifact {
  return {
    ...artifact,
    diagnostics,
  };
}

export function okValidationResult(): ValidationResult {
  return { valid: true, diagnostics: [] };
}

export function addEntryFunction(context: GenerationContext, entryName: string): void {
  if (!context.entryFunctions.includes(entryName)) {
    context.entryFunctions.push(entryName);
  }
}

function sanitizeFragment(input: string): string {
  const collapsed = input
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return collapsed.length > 0 ? collapsed.toLowerCase() : "generated";
}

export function createCommentBlock(node: IRNode, fragments: readonly string[]): readonly AnnotatedLine[] {
  return fragments.map((fragment) => ({
    code: `// ${fragment}`,
    nodeId: node.id,
    indent: 2,
  }));
}

export function bindingName(node: IRNode): string {
  return `${sanitizeFragment(node.type)}_${sanitizeFragment(node.id)}`;
}

export function socketBindingKey(nodeId: string, socketId: string): string {
  return `${nodeId}:${socketId}`;
}

export function bindOutput(context: GenerationContext, node: IRNode, socketId: string): string {
  const binding = `${bindingName(node)}_${sanitizeFragment(socketId)}`;

  context.bindings.set(socketBindingKey(node.id, socketId), binding);
  return binding;
}

export function resolveInput(context: GenerationContext, node: IRNode, socketId: string, fallback: string): string {
  const connection = node.inputs[socketId];
  if (connection === undefined) {
    return fallback;
  }

  const resolvedBinding = context.bindings.get(socketBindingKey(connection.sourceNodeId, connection.sourceSocketId));
  return resolvedBinding === undefined ? fallback : resolvedBinding;
}