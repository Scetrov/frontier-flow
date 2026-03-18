import { createGenerationContext, getGenerator } from "./generators";
import type { AnnotatedLine, EmitterOutput, IRGraph, SourceMapEntry } from "./types";

function createMoveToml(moduleName: string): string {
  return [
    "[package]",
    `name = "${moduleName}"`,
    'edition = "2024.beta"',
    "",
    "[dependencies]",
    'Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }',
    "",
    "[addresses]",
    'builder_extensions = "0x0"',
    'sui = "0x2"',
    "",
  ].join("\n");
}

function pushLine(lines: string[], sourceMap: SourceMapEntry[], code: string, nodeId: string | null): void {
  lines.push(code);
  if (nodeId !== null) {
    sourceMap.push({
      line: lines.length,
      astNodeId: nodeId,
      reactFlowNodeId: nodeId,
    });
  }
}

/**
 * Emit deterministic Move source and source map output from the validated IR graph.
 */
export function emitMove(graph: IRGraph): EmitterOutput {
  const context = createGenerationContext(graph.moduleName);
  const annotatedLines: AnnotatedLine[] = [];

  for (const nodeId of graph.executionOrder) {
    const node = graph.nodes.get(nodeId);
    if (node === undefined) {
      continue;
    }

    const generator = getGenerator(node.type);
    if (generator === undefined) {
      continue;
    }

    annotatedLines.push(...generator.emit(node, context));
  }

  const lines: string[] = [];
  const sourceMap: SourceMapEntry[] = [];

  pushLine(lines, sourceMap, `module builder_extensions::${graph.moduleName} {`, null);
  pushLine(lines, sourceMap, "", null);

  for (const structDeclaration of Array.from(new Set(context.structs)).sort()) {
    pushLine(lines, sourceMap, `    ${structDeclaration}`, null);
  }

  if (context.structs.length > 0) {
    pushLine(lines, sourceMap, "", null);
  }

  for (const entryFunction of context.entryFunctions.sort()) {
    pushLine(lines, sourceMap, `    public entry fun ${entryFunction}() {`, null);
    pushLine(lines, sourceMap, `        // entry point ${entryFunction}`, null);
    pushLine(lines, sourceMap, "    }", null);
    pushLine(lines, sourceMap, "", null);
  }

  pushLine(lines, sourceMap, "    public fun execute() {", null);
  pushLine(lines, sourceMap, "        let _compiled = true;", null);

  for (const annotatedLine of annotatedLines) {
    pushLine(lines, sourceMap, `${"    ".repeat(annotatedLine.indent)}${annotatedLine.code}`, annotatedLine.nodeId);
  }

  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "}", null);

  return {
    code: lines.join("\n"),
    moveToml: createMoveToml(graph.moduleName),
    sourceMap,
  };
}