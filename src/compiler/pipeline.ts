import { buildIrGraph } from "./irBuilder";
import { emitMove } from "./emitter";
import { compileMove } from "./moveCompiler";
import { optimiseGraph } from "./optimiser";
import { collectSanitizationDiagnostics, sanitizeGraph } from "./sanitizer";
import type { PipelineInput, PipelineResult } from "./types";
import { validateGraph } from "./validator";

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new DOMException("Compilation aborted", "AbortError");
  }
}

/**
 * Execute the full graph-to-WASM compilation pipeline.
 */
export async function compilePipeline({ nodes, edges, moduleName, signal }: PipelineInput): Promise<PipelineResult> {
  throwIfAborted(signal);
  const irGraph = buildIrGraph(nodes, edges, moduleName);

  throwIfAborted(signal);
  const validation = validateGraph(irGraph);
  if (!validation.valid) {
    return {
      status: { state: "error", diagnostics: validation.diagnostics },
      diagnostics: validation.diagnostics,
      code: null,
      sourceMap: null,
      optimizationReport: null,
      artifact: null,
    };
  }

  throwIfAborted(signal);
  const sanitizationDiagnostics = collectSanitizationDiagnostics(irGraph);
  if (sanitizationDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return {
      status: { state: "error", diagnostics: sanitizationDiagnostics },
      diagnostics: sanitizationDiagnostics,
      code: null,
      sourceMap: null,
      optimizationReport: null,
      artifact: null,
    };
  }

  const sanitizedGraph = sanitizeGraph(irGraph);
  const { graph: optimisedGraph, report } = optimiseGraph(sanitizedGraph);
  const emitted = emitMove(optimisedGraph);

  throwIfAborted(signal);
  const compileResult = await compileMove(emitted.artifact);
  throwIfAborted(signal);

  if (!compileResult.success || compileResult.modules === null) {
    const diagnostics = compileResult.errors ?? [];
    return {
      status: { state: "error", diagnostics, artifact: compileResult.artifact ?? emitted.artifact },
      diagnostics,
      code: emitted.code,
      sourceMap: emitted.sourceMap,
      optimizationReport: report,
      artifact: compileResult.artifact ?? emitted.artifact,
    };
  }

  return {
    status: {
      state: "compiled",
      bytecode: compileResult.modules,
      artifact: compileResult.artifact ?? emitted.artifact,
    },
    diagnostics: compileResult.warnings,
    code: emitted.code,
    sourceMap: emitted.sourceMap,
    optimizationReport: report,
    artifact: compileResult.artifact ?? emitted.artifact,
  };
}