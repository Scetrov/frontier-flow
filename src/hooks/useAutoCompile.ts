import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compilePipeline } from "../compiler/pipeline";
import type { CompilationState, CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import type { FlowEdge, FlowNode } from "../types/nodes";

export const AUTO_COMPILE_IDLE_MS = 2500;
const IDLE_STATUS: CompilationStatus = { state: "idle" };
const EMPTY_DIAGNOSTICS: readonly CompilerDiagnostic[] = [];

function compareNullableStrings(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  return left.localeCompare(right);
}

function createCompilationGraphKey(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
): string {
  return JSON.stringify({
    edges: edges
      .map((edge) => ({
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? null,
        target: edge.target,
        targetHandle: edge.targetHandle ?? null,
      }))
      .sort((left, right) => {
        const sourceCompare = left.source.localeCompare(right.source);
        if (sourceCompare !== 0) {
          return sourceCompare;
        }

        const targetCompare = left.target.localeCompare(right.target);
        if (targetCompare !== 0) {
          return targetCompare;
        }

        const sourceHandleCompare = compareNullableStrings(left.sourceHandle, right.sourceHandle);
        if (sourceHandleCompare !== 0) {
          return sourceHandleCompare;
        }

        return compareNullableStrings(left.targetHandle, right.targetHandle);
      }),
    moduleName,
    nodes: nodes
      .map((node) => ({
        category: node.data.category,
        id: node.id,
        label: node.data.label,
        sockets: node.data.sockets.map((socket) => ({
          direction: socket.direction,
          id: socket.id,
          label: socket.label,
          position: socket.position,
          type: socket.type,
        })),
        type: node.type ?? null,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
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

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    moduleNameRef.current = moduleName;
    graphKeyRef.current = graphKey;
  }, [edges, graphKey, moduleName, nodes]);

  const runCompilation = useCallback(async () => {
    abortControllerRef.current?.abort();
    const requestId = compilationRequestIdRef.current + 1;
    const requestGraphKey = graphKeyRef.current;
    compilationRequestIdRef.current = requestId;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setActiveGraphKey(requestGraphKey);
    setDiagnostics(EMPTY_DIAGNOSTICS);
    setSourceCode(null);
    setStatus({ state: "compiling" });

    try {
      const result = await compilePipeline({
        nodes: nodesRef.current,
        edges: edgesRef.current,
        moduleName: moduleNameRef.current,
        signal: abortController.signal,
      });

      if (
        abortController.signal.aborted ||
        requestId !== compilationRequestIdRef.current ||
        requestGraphKey !== graphKeyRef.current
      ) {
        return;
      }

      setActiveGraphKey(null);
      setSettledGraphKey(requestGraphKey);
      setDiagnostics(result.diagnostics);
      setSourceCode(result.code);
      setStatus(result.status);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (requestId !== compilationRequestIdRef.current || requestGraphKey !== graphKeyRef.current) {
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
      setActiveGraphKey(null);
      setSettledGraphKey(requestGraphKey);
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
  }, [graphKey, idleMs, runCompilation]);

  const triggerCompile = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    void runCompilation();
  }, [runCompilation]);

  const isCurrentGraphCompiling = activeGraphKey === graphKey && status.state === "compiling";
  const isCurrentGraphSettled = settledGraphKey === graphKey;
  const visibleStatus = isCurrentGraphCompiling || isCurrentGraphSettled ? status : IDLE_STATUS;
  const visibleDiagnostics = isCurrentGraphCompiling || isCurrentGraphSettled ? diagnostics : EMPTY_DIAGNOSTICS;

  return {
    status: visibleStatus,
    diagnostics: visibleDiagnostics,
    sourceCode: isCurrentGraphCompiling || isCurrentGraphSettled ? sourceCode : null,
    triggerCompile,
  };
}