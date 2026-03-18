import type {
  AnnotatedLine,
  GeneratedContractArtifact,
  GenerationContext,
  IRNode,
  SourceMapEntry,
  ValidationResult,
} from "../types";

export const GENERATED_ARTIFACT_SOURCE_DIR = "sources";

export function createGeneratedSourceFilePath(moduleName: string): string {
  return `${GENERATED_ARTIFACT_SOURCE_DIR}/${moduleName}.move`;
}

export function createGeneratedContractArtifact(
  moduleName: string,
  moveToml: string,
  moveSource: string,
  sourceMap: readonly SourceMapEntry[],
): GeneratedContractArtifact {
  return {
    moduleName,
    sourceFilePath: createGeneratedSourceFilePath(moduleName),
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
  return {
    ...artifact,
    bytecodeModules,
    dependencies,
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

  return context.bindings.get(socketBindingKey(connection.sourceNodeId, connection.sourceSocketId)) ?? fallback;
}