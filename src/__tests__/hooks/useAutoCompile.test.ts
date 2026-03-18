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
    const { rerender, result } = renderHook(
      ({ nodeId }) => useAutoCompile([createFlowNode(nodeId, "aggression")], [], "starter_contract"),
      { initialProps: { nodeId: "node_1" } },
    );

    act(() => {
      vi.advanceTimersByTime(AUTO_COMPILE_IDLE_MS - 100);
    });
    expect(compilePipeline).not.toHaveBeenCalled();

    act(() => {
      rerender({ nodeId: "node_2" });
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
    const { result } = renderHook(() => useAutoCompile([createFlowNode("node_1", "aggression")], [], "starter_contract"));

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

    const { rerender, result } = renderHook(
      ({ nodeId }) => useAutoCompile([createFlowNode(nodeId, "aggression")], [], "starter_contract", 100),
      { initialProps: { nodeId: "node_1" } },
    );

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(compilePipeline).toHaveBeenCalledTimes(1);
    expect(result.current.status.state).toBe("compiling");

    act(() => {
      rerender({ nodeId: "node_2" });
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
    expect(result.current.status.state).toBe("compiled");
  });
});