import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";

import { useAuthorization, type AuthorizationWalletAccount, type AuthorizationWalletConnection } from "../hooks/useAuthorization";
import type { StoredDeploymentState } from "../types/authorization";
import type { AuthorizationChainClient } from "../utils/authorizationChainClient";
import { AmbiguousSubmissionError } from "../utils/suiTransactionExecution";
import type { buildAuthorizeTurretTransaction } from "../utils/authorizationTransaction";

type CurrentAccount = AuthorizationWalletAccount;
type CurrentWallet = AuthorizationWalletConnection;

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
  return { address: "0x1234", chains: ["sui:testnet"] };
}

function createConnectedWallet(): CurrentWallet {
  return { currentWallet: { name: "Sui Wallet" }, isConnected: true, supportedIntents: [] };
}

function createSuiClient(overrides: Partial<AuthorizationChainClient> = {}): AuthorizationChainClient {
  return {
    executeSigned: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    isTurretAuthReady: vi.fn(() => Promise.resolve(true)),
    readEvents: vi.fn(() => Promise.resolve([])),
    waitForEffects: vi.fn(() => Promise.resolve({ success: true })),
    ...overrides,
  };
}

function createTransaction(): ReturnType<typeof buildAuthorizeTurretTransaction> {
  return {
    setSenderIfNotSet: vi.fn(),
    toJSON: vi.fn(() => Promise.resolve("{}")),
  } as unknown as ReturnType<typeof buildAuthorizeTurretTransaction>;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(async () => {
  await act(async () => { await vi.runOnlyPendingTimersAsync(); });
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useAuthorization", () => {
  it("marks a turret confirmed after the authorization event is observed", async () => {
    const fetchCharacterIdFn = vi.fn(() => Promise.resolve("0xcharacter"));
    const fetchOwnerCapFn = vi.fn(() => Promise.resolve("0xownercap"));
    const queryAuthorizationEventFn = vi.fn(() => Promise.resolve(true));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient(),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 50,
      fetchCharacterIdFn,
      fetchOwnerCapFn,
      queryAuthorizationEventFn,
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" })),
    }));
    await act(async () => { await result.current.startAuthorization(["0x1111"]); });
    expect(fetchOwnerCapFn).toHaveBeenCalledWith({ deploymentState, turretObjectId: "0x1111", walletAddress: "0x1234" });
    expect(queryAuthorizationEventFn).toHaveBeenCalledTimes(1);
    expect(result.current.progress?.targets[0]?.status).toBe("confirmed");
    expect(result.current.summary.confirmed).toBe(1);
  });

  it("exposes explicit abort handling for an in-flight batch", async () => {
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
      queryAuthorizationEventFn: vi.fn(() => Promise.resolve(false)),
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" })),
    }));
    await act(async () => {
      void result.current.startAuthorization(["0x1111", "0x2222"]);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isAuthorizing).toBe(true);
    act(() => { result.current.abortAuthorization(); });
    expect(result.current.isAuthorizing).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it("waits for TurretAuth readiness before signing", async () => {
    const isTurretAuthReady = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient({ isTurretAuthReady }),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
      signTransactionFn,
    }));
    await act(async () => {
      const pending = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(100);
      await pending;
    });
    expect(isTurretAuthReady).toHaveBeenNthCalledWith(1, deploymentState.packageId, deploymentState.moduleName);
    expect(signTransactionFn).toHaveBeenCalledTimes(1);
    expect(result.current.progress?.targets[0]?.status).toBe("confirmed");
  });

  it("fails closed when TurretAuth never becomes queryable", async () => {
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient({ isTurretAuthReady: vi.fn(() => Promise.reject(new Error("TypeNotFound"))) }),
      buildTransactionFn: vi.fn(() => createTransaction()),
      confirmationTimeoutMs: 200,
      eventPollingIntervalMs: 100,
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
      signTransactionFn,
    }));
    await act(async () => {
      const pending = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(250);
      await pending;
    });
    expect(signTransactionFn).not.toHaveBeenCalled();
    expect(result.current.progress?.targets[0]?.status).toBe("failed");
    expect(result.current.progress?.targets[0]?.errorMessage).toContain("Last read error: TypeNotFound");
  });

  it("rejects a wallet chain that does not match the deployment network", async () => {
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: { address: "0x1234", chains: ["sui:mainnet"] },
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient(),
      buildTransactionFn: vi.fn(() => createTransaction()),
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      signTransactionFn,
    }));
    await act(async () => { await result.current.startAuthorization(["0x1111"]); });
    expect(signTransactionFn).not.toHaveBeenCalled();
    expect(result.current.progress?.targets[0]?.status).toBe("failed");
    expect(result.current.progress?.targets[0]?.errorMessage).toContain("sui:testnet");
  });

  it("does not sign again when submission is ambiguous", async () => {
    const executeSigned = vi.fn(() => Promise.reject(new AmbiguousSubmissionError("Submission outcome is unresolved. Nothing will be signed or submitted again automatically.", "0xmaybe")));
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
    const { result } = renderHook(() => useAuthorization({
      deploymentState,
      walletAccount: createConnectedAccount(),
      currentWallet: createConnectedWallet(),
      suiClient: createSuiClient({ executeSigned }),
      buildTransactionFn: vi.fn(() => createTransaction()),
      fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
      fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
      signTransactionFn,
    }));
    await act(async () => { await result.current.startAuthorization(["0x1111"]); });
    expect(signTransactionFn).toHaveBeenCalledTimes(1);
    expect(executeSigned).toHaveBeenCalledTimes(1);
    expect(result.current.progress?.targets[0]?.status).toBe("warning");
    expect(result.current.progress?.targets[0]?.transactionDigest).toBe("0xmaybe");
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
      signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" })),
    }));
    await act(async () => {
      const pending = result.current.startAuthorization(["0x1111"]);
      await vi.advanceTimersByTimeAsync(250);
      await pending;
    });
    expect(queryAuthorizationEventFn).toHaveBeenCalled();
    expect(result.current.progress?.targets[0]?.status).toBe("warning");
  });

  it("cancels an in-flight batch when the deployment context changes", async () => {
    let releaseConfirmation: (() => void) | null = null;
    const waitForEffects = vi.fn(() => new Promise<{ success: boolean }>((resolve) => {
      releaseConfirmation = () => { resolve({ success: true }); };
    }));
    const { result, rerender } = renderHook(
      ({ currentDeploymentState }) => useAuthorization({
        deploymentState: currentDeploymentState,
        walletAccount: createConnectedAccount(),
        currentWallet: createConnectedWallet(),
        suiClient: createSuiClient({ waitForEffects }),
        buildTransactionFn: vi.fn(() => createTransaction()),
        confirmationTimeoutMs: 200,
        eventPollingIntervalMs: 100,
        fetchCharacterIdFn: vi.fn(() => Promise.resolve("0xcharacter")),
        fetchOwnerCapFn: vi.fn(() => Promise.resolve("0xownercap")),
        queryAuthorizationEventFn: vi.fn(() => Promise.resolve(true)),
        signTransactionFn: vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" })),
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
    await act(async () => { releaseConfirmation?.(); await Promise.resolve(); });
    expect(result.current.isAuthorizing).toBe(false);
  });
});
