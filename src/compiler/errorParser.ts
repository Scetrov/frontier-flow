import type { CompilerDiagnostic, SourceMapEntry } from "./types";

function extractSeverity(rawLine: string): "error" | "warning" {
  return /warning/i.test(rawLine) ? "warning" : "error";
}

function isDiagnosticHeader(rawLine: string): boolean {
  return /(error|warning)/i.test(rawLine);
}

function isSourceLocationLine(rawLine: string): boolean {
  return /^sources\/[^:\s]+:\d+(?::\d+)?$/.test(rawLine);
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
    .filter((line) => line.length > 0);

  const diagnosticsToParse: Array<{ readonly header: string; readonly location: string | null }> = [];
  let pendingHeader: string | null = null;

  for (const rawLine of nonEmptyLines) {
    if (isDiagnosticHeader(rawLine)) {
      if (pendingHeader !== null) {
        diagnosticsToParse.push({ header: pendingHeader, location: null });
      }

      pendingHeader = rawLine;
      continue;
    }

    if (pendingHeader !== null && isSourceLocationLine(rawLine)) {
      diagnosticsToParse.push({ header: pendingHeader, location: rawLine });
      pendingHeader = null;
    }
  }

  if (pendingHeader !== null) {
    diagnosticsToParse.push({ header: pendingHeader, location: null });
  }

  const linesToParse = diagnosticsToParse.length > 0
    ? diagnosticsToParse
    : [rawOutput.trim()].filter((line) => line.length > 0).map((line) => ({ header: line, location: null }));

  if (linesToParse.length === 0) {
    return [];
  }

  return linesToParse.map(({ header, location }) => {
    const line = extractLine(header) ?? (location === null ? null : extractLine(location));
    const source = line === null ? undefined : sourceMap.find((entry) => entry.line === line);
    const rawMessage = location === null ? header : `${header}\n${location}`;

    return {
      severity: extractSeverity(header),
      stage: "compilation",
      rawMessage,
      line,
      reactFlowNodeId: source?.reactFlowNodeId ?? null,
      socketId: null,
      userMessage: toUserMessage(header),
    } satisfies CompilerDiagnostic;
  });
}