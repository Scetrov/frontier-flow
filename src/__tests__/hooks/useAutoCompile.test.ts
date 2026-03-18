import { act, renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../compiler/pipeline", () => ({
  compilePipeline: vi.fn().mockResolvedValue({
    status: { state: "compiled", bytecode: [new Uint8Array([1])] },
    diagnostics: [],
    code: "module builder_extensions::starter_contract {}",
    sourceMap: [],
    optimizationReport: null,
  }),
}));

import { compilePipeline } from "../../compiler/pipeline";
import { AUTO_COMPILE_IDLE_MS, useAutoCompile } from "../../hooks/useAutoCompile";
import { createFlowNode } from "../compiler/helpers";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const reactActEnvironmentGlobal = globalThis as ReactActEnvironmentGlobal;

let previousActEnvironment: boolean | undefined;

describe("useAutoCompile", () => {
  const emptyEdges: [] = [];

  beforeAll(() => {
    previousActEnvironment = reactActEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT;
    reactActEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    vi.useRealTimers();
  });

  afterAll(() => {
    reactActEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  it("debounces graph edits before compiling", async () => {
    const firstNodes = [createFlowNode("node_1", "aggression")];
    const secondNodes = [createFlowNode("node_2", "aggression")];

    const { rerender, result } = renderHook(
      ({ nodes }) => useAutoCompile(nodes, emptyEdges, "starter_contract"),
      { initialProps: { nodes: firstNodes } },
    );

    act(() => {
      vi.advanceTimersByTime(AUTO_COMPILE_IDLE_MS - 100);
    });
    expect(compilePipeline).not.toHaveBeenCalled();

    act(() => {
      rerender({ nodes: secondNodes });
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTO_COMPILE_IDLE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(1);
    expect(result.current.status.state).toBe("compiled");
  });

  it("supports manual compilation triggers", async () => {
    const nodes = [createFlowNode("node_1", "aggression")];

    const { result } = renderHook(() => useAutoCompile(nodes, emptyEdges, "starter_contract"));

    await act(async () => {
      result.current.triggerCompile();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(1);
    expect(result.current.status.state).toBe("compiled");
  });

  it("restarts compilation after an edit aborts an in-flight compile", async () => {
    let firstSignal: AbortSignal | undefined;

    vi.mocked(compilePipeline)
      .mockImplementationOnce(({ signal }) => {
        firstSignal = signal;

        return new Promise<Awaited<ReturnType<typeof compilePipeline>>>((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        });
      })
      .mockResolvedValueOnce({
        status: { state: "compiled", bytecode: [new Uint8Array([1])] },
        diagnostics: [],
        code: "module builder_extensions::starter_contract {}",
        sourceMap: [],
        optimizationReport: null,
      });

    const firstNodes = [createFlowNode("node_1", "aggression")];
    const secondNodes = [createFlowNode("node_2", "aggression")];

    const { rerender, result } = renderHook(
      ({ nodes }) => useAutoCompile(nodes, emptyEdges, "starter_contract", 100),
      { initialProps: { nodes: firstNodes } },
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(1);
    expect(result.current.status.state).toBe("compiling");

    act(() => {
      rerender({ nodes: secondNodes });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstSignal).toBeDefined();
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(2);
  });

  it("returns to idle while waiting for the next debounced compile after an edit", async () => {
    const firstNodes = [createFlowNode("node_1", "aggression")];
    const secondNodes = [createFlowNode("node_2", "aggression")];

    const { rerender, result } = renderHook(
      ({ nodes }) => useAutoCompile(nodes, emptyEdges, "starter_contract", 100),
      { initialProps: { nodes: firstNodes } },
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status.state).toBe("compiled");
    expect(result.current.sourceCode).toBe("module builder_extensions::starter_contract {}");

    act(() => {
      rerender({ nodes: secondNodes });
    });

    expect(result.current.status.state).toBe("idle");
    expect(result.current.diagnostics).toEqual([]);
    expect(result.current.sourceCode).toBeNull();

    act(() => {
      vi.advanceTimersByTime(99);
    });

    expect(compilePipeline).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(2);
  });

  it("ignores stale compilation results after an edit invalidates the request", async () => {
    let resolveFirstCompilation: ((value: Awaited<ReturnType<typeof compilePipeline>>) => void) | undefined;

    vi.mocked(compilePipeline)
      .mockImplementationOnce(
        () =>
          new Promise<Awaited<ReturnType<typeof compilePipeline>>>((resolve) => {
            resolveFirstCompilation = resolve;
          }),
      )
      .mockResolvedValueOnce({
        status: { state: "compiled", bytecode: [new Uint8Array([1])] },
        diagnostics: [],
        code: "module builder_extensions::starter_contract {}",
        sourceMap: [],
        optimizationReport: null,
      });

    const firstNodes = [createFlowNode("node_1", "aggression")];
    const secondNodes = [createFlowNode("node_2", "aggression")];

    const { rerender, result } = renderHook(
      ({ nodes }) => useAutoCompile(nodes, emptyEdges, "starter_contract", 100),
      { initialProps: { nodes: firstNodes } },
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(result.current.status.state).toBe("compiling");

    act(() => {
      rerender({ nodes: secondNodes });
    });

    expect(result.current.status.state).toBe("idle");

    await act(async () => {
      resolveFirstCompilation?.({
        status: { state: "compiled", bytecode: [new Uint8Array([9])] },
        diagnostics: [],
        code: "module builder_extensions::stale_contract {}",
        sourceMap: [],
        optimizationReport: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status.state).toBe("idle");
    expect(result.current.sourceCode).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(2);
    expect(result.current.status.state).toBe("compiled");
    expect(result.current.sourceCode).toBe("module builder_extensions::starter_contract {}");
  });
});