import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import { useTurretList } from "../hooks/useTurretList";

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

const turretFixtures: readonly TurretInfo[] = [
  {
    objectId: "0x111",
    displayName: "Perimeter Lancer",
    currentExtension: null,
  },
];

describe("useTurretList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("transitions from loading to success on mount", async () => {
    const fetchTurretsFn = vi.fn().mockResolvedValue(turretFixtures);

    const { result } = renderHook(() => useTurretList({
      deploymentState,
      walletAddress: "0x1234",
      fetchTurretsFn,
    }));

    expect(result.current.status).toBe("loading");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.turrets).toEqual(turretFixtures);
  });

  it("transitions from loading to error when fetching fails", async () => {
    const fetchTurretsFn = vi.fn().mockRejectedValue(new Error("GraphQL unavailable"));

    const { result } = renderHook(() => useTurretList({
      deploymentState,
      walletAddress: "0x1234",
      fetchTurretsFn,
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("GraphQL unavailable");
  });

  it("retries the query when refresh is requested", async () => {
    const fetchTurretsFn = vi.fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(turretFixtures);

    const { result } = renderHook(() => useTurretList({
      deploymentState,
      walletAddress: "0x1234",
      fetchTurretsFn,
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");

    await act(async () => {
      await result.current.refresh();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchTurretsFn).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("success");
    expect(result.current.turrets).toEqual(turretFixtures);
  });

  it("aborts the in-flight request when the hook unmounts", async () => {
    let activeSignal: AbortSignal | undefined;
    const fetchTurretsFn = vi.fn().mockImplementation(async ({ signal }: { readonly signal?: AbortSignal }) => {
      activeSignal = signal;

      return new Promise<readonly TurretInfo[]>((_, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });
    });

    const { unmount } = renderHook(() => useTurretList({
      deploymentState,
      walletAddress: "0x1234",
      fetchTurretsFn,
    }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(activeSignal).toBeDefined();
    expect(activeSignal?.aborted).toBe(false);

    unmount();

    expect(activeSignal?.aborted).toBe(true);
  });

  it("refreshes automatically when the target changes", async () => {
    const fetchTurretsFn = vi.fn().mockResolvedValue(turretFixtures);
    const nextDeploymentState: StoredDeploymentState = {
      ...deploymentState,
      targetId: "testnet:utopia",
    };

    const { rerender } = renderHook(
      ({ currentDeploymentState }) => useTurretList({
        deploymentState: currentDeploymentState,
        walletAddress: "0x1234",
        fetchTurretsFn,
      }),
      { initialProps: { currentDeploymentState: deploymentState } },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    rerender({ currentDeploymentState: nextDeploymentState });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchTurretsFn).toHaveBeenCalledTimes(2);
    expect(fetchTurretsFn).toHaveBeenLastCalledWith(expect.objectContaining({
      deploymentState: nextDeploymentState,
    }));
  });
});