import type { CompilerDiagnostic, SourceMapEntry } from "./types";

function extractSeverity(rawLine: string): "error" | "warning" {
  return /warning/i.test(rawLine) ? "warning" : "error";
}

function extractLine(rawLine: string): number | null {
  const match = rawLine.match(/:(\d+)(?::\d+)?/) ?? rawLine.match(/line\s+(\d+)/i);
  return match === null ? null : Number(match[1]);
}

function toUserMessage(rawLine: string): string {
  return rawLine.replace(/^\s*(error|warning)[^:]*:?\s*/i, "").trim() || "Compiler reported an issue.";
}

/**
 * Parse raw Move compiler output into UI-friendly diagnostics mapped back to source lines.
 */
export function parseCompilerOutput(rawOutput: string, sourceMap: readonly SourceMapEntry[]): readonly CompilerDiagnostic[] {
  const nonEmptyLines = rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && /(error|warning)|:\d+/.test(line));

  const linesToParse = nonEmptyLines.length > 0 ? nonEmptyLines : [rawOutput.trim()].filter((line) => line.length > 0);
  if (linesToParse.length === 0) {
    return [];
  }

  return linesToParse.map((rawLine) => {
    const line = extractLine(rawLine);
    const source = line === null ? undefined : sourceMap.find((entry) => entry.line === line);

    return {
      severity: extractSeverity(rawLine),
      rawMessage: rawLine,
      line,
      reactFlowNodeId: source?.reactFlowNodeId ?? null,
      socketId: null,
      userMessage: toUserMessage(rawLine),
    } satisfies CompilerDiagnostic;
  });
}