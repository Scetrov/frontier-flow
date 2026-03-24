import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CompilationState, CompilationStatus, CompilerDiagnostic, GeneratedContractArtifact } from "../compiler/types";
import type { FlowEdge, FlowNode } from "../types/nodes";
import { createCompilationGraphKey } from "../utils/compilationGraphKey";

export const AUTO_COMPILE_IDLE_MS = 2500;
const IDLE_STATUS: CompilationStatus = { state: "idle" };
const EMPTY_DIAGNOSTICS: readonly CompilerDiagnostic[] = [];

type CompilePipelineModule = typeof import("../compiler/pipeline");

interface CompilationRequestState {
  readonly abortController: AbortController;
  readonly requestGraphKey: string;
  readonly requestId: number;
}

interface WritableRef<T> {
  current: T;
}

let compilePipelineModulePromise: Promise<CompilePipelineModule> | null = null;

function resetCompilePipelineLoader() {
  compilePipelineModulePromise = null;
}

async function loadCompilePipeline(): Promise<CompilePipelineModule> {
  if (compilePipelineModulePromise === null) {
    compilePipelineModulePromise = import("../compiler/pipeline").catch((error: unknown) => {
      resetCompilePipelineLoader();
      throw error;
    });
  }

  return compilePipelineModulePromise;
}

function isAbortedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function createFallbackDiagnostics(error: unknown): readonly CompilerDiagnostic[] {
  const rawMessage = error instanceof Error ? error.message : String(error);
  return [
    {
      severity: "error",
      rawMessage,
      line: null,
      reactFlowNodeId: null,
      socketId: null,
      userMessage: rawMessage,
    } satisfies CompilerDiagnostic,
  ];
}

function isStaleCompilation(
  request: CompilationRequestState,
  latestRequestId: number,
  activeGraphKey: string,
): boolean {
  return request.abortController.signal.aborted || request.requestId !== latestRequestId || request.requestGraphKey !== activeGraphKey;
}

function clearCompileTimer(timerRef: React.RefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function createCompilationRequest(
  abortControllerRef: WritableRef<AbortController | null>,
  compilationRequestIdRef: WritableRef<number>,
  graphKeyRef: WritableRef<string>,
): CompilationRequestState {
  abortControllerRef.current?.abort();

  const request = {
    abortController: new AbortController(),
    requestGraphKey: graphKeyRef.current,
    requestId: compilationRequestIdRef.current + 1,
  } satisfies CompilationRequestState;

  compilationRequestIdRef.current = request.requestId;
  abortControllerRef.current = request.abortController;
  return request;
}

/**
 * Debounce graph edits and run the compilation pipeline after the editor goes idle.
 */
export function useAutoCompile(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
  idleMs = AUTO_COMPILE_IDLE_MS,
): CompilationState {
  const [status, setStatus] = useState<CompilationStatus>(IDLE_STATUS);
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>(EMPTY_DIAGNOSTICS);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<GeneratedContractArtifact | null>(null);
  const [activeGraphKey, setActiveGraphKey] = useState<string | null>(null);
  const [settledGraphKey, setSettledGraphKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const compilationRequestIdRef = useRef(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const moduleNameRef = useRef(moduleName);
  const graphKey = useMemo(() => createCompilationGraphKey(nodes, edges, moduleName), [edges, moduleName, nodes]);
  const graphKeyRef = useRef(graphKey);
  const abortActiveCompilation = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    moduleNameRef.current = moduleName;
    graphKeyRef.current = graphKey;
  }, [edges, graphKey, moduleName, nodes]);

  const runCompilation = useCallback(async () => {
    const request = createCompilationRequest(abortControllerRef, compilationRequestIdRef, graphKeyRef);
    setActiveGraphKey(request.requestGraphKey);
    setDiagnostics(EMPTY_DIAGNOSTICS);
    setSourceCode(null);
    setArtifact(null);
    setStatus({ state: "compiling" });

    try {
      const { compilePipeline } = await loadCompilePipeline();
      const result = await compilePipeline({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        moduleName: moduleNameRef.current,
        signal: request.abortController.signal,
      });

      if (isStaleCompilation(request, compilationRequestIdRef.current, graphKeyRef.current)) {
        return;
      }

      setActiveGraphKey(null);
      setSettledGraphKey(request.requestGraphKey);
      setDiagnostics(result.diagnostics);
      setSourceCode(result.artifact?.moveSource ?? result.code);
      setArtifact(result.artifact ?? null);
      setStatus(result.status);
    } catch (error) {
      if (isAbortedError(error)) {
        return;
      }

      if (isStaleCompilation(request, compilationRequestIdRef.current, graphKeyRef.current)) {
        return;
      }

      const fallbackDiagnostics = createFallbackDiagnostics(error);
      setActiveGraphKey(null);
      setSettledGraphKey(request.requestGraphKey);
      setSourceCode(null);
      setArtifact(null);
      setDiagnostics(fallbackDiagnostics);
      setStatus({ state: "error", diagnostics: fallbackDiagnostics });
    }
  }, []);

  useEffect(() => {
    abortActiveCompilation();

    clearCompileTimer(timerRef);

    timerRef.current = window.setTimeout(() => {
      void runCompilation();
    }, idleMs);

    return () => {
      clearCompileTimer(timerRef);
      abortActiveCompilation();
    };
  }, [abortActiveCompilation, graphKey, idleMs, runCompilation]);

  const triggerCompile = useCallback(() => {
    clearCompileTimer(timerRef);

    void runCompilation();
  }, [runCompilation]);

  const isCurrentGraphCompiling = activeGraphKey === graphKey && status.state === "compiling";
  const isCurrentGraphSettled = settledGraphKey === graphKey;
  const shouldShowCurrentGraphState = isCurrentGraphCompiling || isCurrentGraphSettled;

  return {
    status: shouldShowCurrentGraphState ? status : IDLE_STATUS,
    diagnostics: shouldShowCurrentGraphState ? diagnostics : EMPTY_DIAGNOSTICS,
    sourceCode: shouldShowCurrentGraphState ? sourceCode : null,
    artifact: shouldShowCurrentGraphState ? artifact : null,
    hasSettledGraph: isCurrentGraphSettled,
    triggerCompile,
  };
}