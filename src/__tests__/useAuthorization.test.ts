import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSuiClient as useSuiClientHook,
} from "@mysten/dapp-kit";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";

import { useAuthorization } from "../hooks/useAuthorization";
import type { StoredDeploymentState } from "../types/authorization";
import type { buildAuthorizeTurretTransaction } from "../utils/authorizationTransaction";
import type { SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

function createConnectedAccount(): CurrentAccount {
  return {
    address: "0x1234",
    chains: [],
    features: [],
    icon: undefined,
    label: undefined,
    publicKey: new Uint8Array(),
  } as CurrentAccount;
}

function createConnectedWallet(): CurrentWallet {
  return {
    connectionStatus: "connected",
    currentWallet: { name: "Sui Wallet" },
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    supportedIntents: [],
  } as unknown as CurrentWallet;
}

function createSuiClient(overrides: Partial<SuiClient> = {}): SuiClient {
  return {
    executeTransactionBlock: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    getNormalizedMoveStruct: vi.fn(() => Promise.resolve({})),
    queryEvents: vi.fn(() => Promise.resolve({ data: [], hasNextPage: false, nextCursor: null })),
    waitForTransaction: vi.fn(() => Promise.resolve({
      digest: "0xdigest",
      effects: { status: { status: "success" } },
    })),
    ...overrides,
  } as unknown as SuiClient;
}

function createTransaction(): ReturnType<typeof buildAuthorizeTurretTransaction> {
  return {
    setSenderIfNotSet: vi.fn(),
    toJSON: vi.fn(() => Promise.resolve("{}")),
  } as unknown as ReturnType<typeof buildAuthorizeTurretTransaction>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useAuthorization", () => {
  it("marks a turret confirmed after the authorization event is observed", async () => {
    const buildTransactionFn = vi.fn(() => createTransaction());
    const fetchCharacterIdFn = vi.fn(() => Promise.resolve("0xcharacter"));
    const fetchOwnerCapFn = vi.fn(() => Promise.resolve("0xownercap"));
    const queryAuthorizationEventFn = vi.fn(() => Promise.resolve(true));
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
      bytes: "dGVzdA==",
      signature: "0xsig",
    }));
    const suiClient = createSuiClient();

    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient,
      buildTransactionFn,
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 50,
      fetchCharacterIdFn,
      fetchOwnerCapFn,
      queryAuthorizationEventFn,
      signTransactionFn,
    }));

    await act(async () => {
      await result.current.startAuthorization(["0x1111"]);
    });

    expect(fetchCharacterIdFn).toHaveBeenCalledTimes(1);
    expect(fetchOwnerCapFn).toHaveBeenCalledWith({
      deploymentState,
      turretObjectId: "0x1111",
      walletAddress: "0x1234",
    });
    expect(queryAuthorizationEventFn).toHaveBeenCalledTimes(1);
    expect(result.current.progress?.targets).toEqual([{
      turretObjectId: "0x1111",
      ownerCapId: "0xownercap",
      status: "confirmed",
      confirmationPhase: null,
      transactionDigest: "0xdigest",
      errorMessage: null,
    }]);
    expect(result.current.summary).toEqual({
      confirmed: 1,
      failed: 0,
      pending: 0,
      warnings: 0,
      total: 1,
    });
    expect(result.current.results).toEqual([{
      turretObjectId: "0x1111",
      status: "confirmed",
      transactionDigest: "0xdigest",
      errorMessage: null,
    }]);
    expect(result.current.progress?.completedAt).not.toBeNull();
  });

  it("exposes explicit abort handling for an in-flight batch", async () => {
    const queryAuthorizationEventFn = vi.fn(() => Promise.resolve(false));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient(),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn,
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
        bytes: "dGVzdA==",
        signature: "0xsig",
      })),
    }));

    await act(async () => {
      void result.current.startAuthorization(["0x1111", "0x2222"]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isAuthorizing).toBe(true);

    act(() => {
      result.current.abortAuthorization();
    });

    expect(result.current.isAuthorizing).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.summary).toEqual({
      confirmed: 0,
      failed: 0,
      pending: 0,
      warnings: 0,
      total: 0,
    });
    expect(result.current.results).toEqual([]);
  });

  it("waits for the deployed witness type to become queryable before signing", async () => {
    const getNormalizedMoveStruct = vi.fn()
      .mockRejectedValueOnce(new Error("TypeNotFound"))
      .mockResolvedValueOnce({});
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
      bytes: "dGVzdA==",
      signature: "0xsig",
    }));

    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient({ getNormalizedMoveStruct }),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
      signTransactionFn,
    }));

    await act(async () => {
      const authorizationPromise = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(100);
      await authorizationPromise;
    });

    expect(getNormalizedMoveStruct).toHaveBeenCalledTimes(2);
    expect(getNormalizedMoveStruct).toHaveBeenNthCalledWith(1, {
      package: deploymentState.packageId,
      module: deploymentState.moduleName,
      struct: "TurretAuth",
    });
    expect(signTransactionFn).toHaveBeenCalledTimes(1);
    expect(result.current.progress?.targets[0]?.status).toBe("confirmed");
  });

  it("fails a turret with a propagation error when the witness type never becomes queryable", async () => {
    const getNormalizedMoveStruct = vi.fn(() => Promise.reject(new Error("TypeNotFound")));
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
      bytes: "dGVzdA==",
      signature: "0xsig",
    }));

    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient({ getNormalizedMoveStruct }),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
      signTransactionFn,
    }));

    await act(async () => {
      const authorizationPromise = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(250);
      await authorizationPromise;
    });

    expect(signTransactionFn).not.toHaveBeenCalled();
    expect(result.current.progress?.targets).toEqual([{
      turretObjectId: "0x1111",
      ownerCapId: "0xownercap",
      status: "failed",
      confirmationPhase: null,
      transactionDigest: null,
      errorMessage: `The deployed extension package is not queryable yet for ${deploymentState.packageId}::${deploymentState.moduleName}::TurretAuth. Wait for testnet propagation and retry authorization, or redeploy if this package is stale. Last RPC error: TypeNotFound`,
    }]);
  });

  it("moves a turret into warning when the event is not observed before timeout", async () => {
    const queryAuthorizationEventFn = vi.fn(() => Promise.resolve(false));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient(),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn,
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
        bytes: "dGVzdA==",
        signature: "0xsig",
      })),
    }));

    await act(async () => {
      const authorizationPromise = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(250);
      await authorizationPromise;
    });

    expect(queryAuthorizationEventFn).toHaveBeenCalledTimes(3);
    expect(result.current.progress?.targets).toEqual([{
      turretObjectId: "0x1111",
      ownerCapId: "0xownercap",
      status: "warning",
      confirmationPhase: "event",
      transactionDigest: "0xdigest",
      errorMessage: "Transaction confirmed, but the authorization event was not observed in time. Retry confirmation or check the target manually.",
    }]);
  });

  it("retries event confirmation for warning turrets and resolves them once the event arrives", async () => {
    let attemptCount = 0;
    const queryAuthorizationEventFn = vi.fn(() => {
      attemptCount += 1;
      return Promise.resolve(attemptCount >= 4);
    });

    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient(),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn,
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
        bytes: "dGVzdA==",
        signature: "0xsig",
      })),
    }));

    await act(async () => {
      const authorizationPromise = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(250);
      await authorizationPromise;
    });

    expect(result.current.progress?.targets[0]?.status).toBe("warning");

    await act(async () => {
      await result.current.retryEventConfirmation("0x1111");
    });

    expect(queryAuthorizationEventFn).toHaveBeenCalledTimes(4);
    expect(result.current.progress?.targets).toEqual([{
      turretObjectId: "0x1111",
      ownerCapId: "0xownercap",
      status: "confirmed",
      confirmationPhase: null,
      transactionDigest: "0xdigest",
      errorMessage: null,
    }]);
    expect(result.current.isAuthorizing).toBe(false);
  });

  it("cancels an in-flight batch when the deployment context changes", async () => {
    let releaseConfirmation: (() => void) | null = null;
    const waitForTransaction = vi.fn(() => new Promise<SuiTransactionBlockResponse>((resolve) => {
      releaseConfirmation = () => {
        resolve({
          digest: "0xdigest",
          effects: { status: { status: "success" } },
        } as unknown as SuiTransactionBlockResponse);
      };
    }));

    const { result, rerender } = renderHook(
      ({ currentDeploymentState }) => useAuthorization({
        deploymentState: currentDeploymentState,
        walletAccount: createConnectedAccount(),
        currentWallet: createConnectedWallet(),
        suiClient: createSuiClient({ waitForTransaction }),
        buildTransactionFn: vi.fn(() => createTransaction()),
        confirmationTimeoutMs: 200,
        eventPollingIntervalMs: 100,
        fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
        fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
        queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
        signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({
          bytes: "dGVzdA==",
          signature: "0xsig",
        })),
      }),
      { initialProps: { currentDeploymentState: deploymentState } },
    );

    await act(async () => {
      void result.current.startAuthorization(["0x1111"]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.progress?.targets[0]?.status).toBe("confirming");

    rerender({ currentDeploymentState: { ...deploymentState, targetId: "testnet:utopia" } });

    expect(result.current.progress).toBeNull();
    expect(result.current.isAuthorizing).toBe(false);

    await act(async () => {
      releaseConfirmation?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.progress).toBeNull();
    expect(result.current.isAuthorizing).toBe(false);
  });
});
