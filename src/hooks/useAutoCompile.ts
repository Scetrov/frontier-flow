import { useCallback, useEffect, useRef, useState } from "react";

import { compilePipeline } from "../compiler/pipeline";
import type { CompilationState, CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import type { FlowEdge, FlowNode } from "../types/nodes";

export const AUTO_COMPILE_IDLE_MS = 2500;

/**
 * Debounce graph edits and run the compilation pipeline after the editor goes idle.
 */
export function useAutoCompile(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
  idleMs = AUTO_COMPILE_IDLE_MS,
): CompilationState {
  const [status, setStatus] = useState<CompilationStatus>({ state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>([]);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const moduleNameRef = useRef(moduleName);
  const statusRef = useRef<CompilationStatus>({ state: "idle" });

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    moduleNameRef.current = moduleName;
    statusRef.current = status;
  }, [edges, moduleName, nodes, status]);

  const runCompilation = useCallback(async () => {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setStatus({ state: "compiling" });

    try {
      const result = await compilePipeline({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        moduleName: moduleNameRef.current,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      setDiagnostics(result.diagnostics);
      setSourceCode(result.code);
      setStatus(result.status);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const rawMessage = error instanceof Error ? error.message : String(error);
      const fallbackDiagnostics = [
        {
          severity: "error",
          rawMessage,
          line: null,
          reactFlowNodeId: null,
          socketId: null,
          userMessage: rawMessage,
        } satisfies CompilerDiagnostic,
      ];
      setSourceCode(null);
      setDiagnostics(fallbackDiagnostics);
      setStatus({ state: "error", diagnostics: fallbackDiagnostics });
    }
  }, []);

  useEffect(() => {
    abortControllerRef.current?.abort();

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void runCompilation();
    }, idleMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortControllerRef.current?.abort();
    };
  }, [edges, idleMs, moduleName, nodes, runCompilation]);

  const triggerCompile = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    void runCompilation();
  }, [runCompilation]);

  return {
    status,
    diagnostics,
    sourceCode,
    triggerCompile,
  };
}