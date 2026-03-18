import type { AnnotatedLine, GenerationContext, IRNode, ValidationResult } from "../types";

export function okValidationResult(): ValidationResult {
  return { valid: true, diagnostics: [] };
}

export function addEntryFunction(context: GenerationContext, entryName: string): void {
  if (!context.entryFunctions.includes(entryName)) {
    context.entryFunctions.push(entryName);
  }
}

export function createCommentBlock(node: IRNode, fragments: readonly string[]): readonly AnnotatedLine[] {
  return fragments.map((fragment) => ({
    code: `// ${fragment}`,
    nodeId: node.id,
    indent: 2,
  }));
}

export function bindingName(node: IRNode): string {
  return `${node.type}_${node.id.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}`;
}