import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSignAndExecuteTransaction as useSignAndExecuteTransactionHook,
  useSuiClient as useSuiClientHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";

import { useDeployment } from "../hooks/useDeployment";
import { loadDeploymentState } from "../utils/deploymentStateStorage";
import { createGeneratedArtifactStub } from "./compiler/helpers";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SignAndExecuteTransaction = ReturnType<typeof useSignAndExecuteTransactionHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

const {
  mockSignTransaction,
  mockUseCurrentAccount,
  mockUseCurrentWallet,
  mockUseSignAndExecuteTransaction,
  mockUseSuiClient,
  mockUseWallets,
} = vi.hoisted(() => ({
  mockSignTransaction: vi.fn<typeof signTransactionFunction>(),
  mockUseCurrentAccount: vi.fn<() => CurrentAccount>(),
  mockUseCurrentWallet: vi.fn<() => CurrentWallet>(),
  mockUseSignAndExecuteTransaction: vi.fn<() => SignAndExecuteTransaction>(),
  mockUseSuiClient: vi.fn<() => SuiClient>(),
  mockUseWallets: vi.fn<() => Wallets>(),
}));
const availableWallet = { name: "Sui Wallet" } as unknown as Wallets[number];

function createConnectedWalletState(): CurrentWallet {
  return {
    connectionStatus: "connected",
    currentWallet: availableWallet,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    supportedIntents: [],
  } as unknown as CurrentWallet;
}

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: mockUseCurrentAccount,
  useCurrentWallet: mockUseCurrentWallet,
  useSignAndExecuteTransaction: mockUseSignAndExecuteTransaction,
  useSuiClient: mockUseSuiClient,
  useWallets: mockUseWallets,
}));

vi.mock("@mysten/wallet-standard", () => ({
  signTransaction: mockSignTransaction,
}));

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  mockUseCurrentAccount.mockReturnValue({
    address: "0x1234",
    chains: [],
    features: [],
    icon: undefined,
    label: undefined,
    publicKey: new Uint8Array(),
  } as CurrentAccount);
  mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
  mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
  mockUseSuiClient.mockReturnValue({
    executeTransactionBlock: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    waitForTransaction: vi.fn(() => Promise.resolve({
      digest: "0xdigest",
      effects: { status: { status: "success" } },
      objectChanges: [{ type: "published", packageId: "0xabc123" }],
    })),
  } as unknown as SuiClient);
  mockUseWallets.mockReturnValue([availableWallet]);
  mockSignTransaction.mockResolvedValue({ bytes: "dGVzdA==", signature: "0xsig" });
  window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=0");
});

afterEach(async () => {
  await act(async () => {
    vi.runOnlyPendingTimers();
    await Promise.resolve();
  });
  vi.useRealTimers();
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("useDeployment success path", () => {
  it("creates a successful deployment result for the selected target", async () => {
    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    act(() => {
      result.current.setSelectedTarget("testnet:stillness");
    });

    await act(async () => {
      await result.current.startDeployment();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(result.current.canDeploy).toBe(true);
    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.latestAttempt?.targetId).toBe("testnet:stillness");
    expect(result.current.latestAttempt?.packageId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.latestAttempt?.confirmationReference).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.deploymentStatus?.status).toBe("deployed");
    expect(result.current.deploymentStatus?.targetId).toBe("testnet:stillness");
    expect(result.current.deploymentStatus?.confirmationReference).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.statusMessage?.headline).toBe("Deployed");
    expect(loadDeploymentState(window.localStorage)).toEqual({
      version: 1,
      packageId: result.current.latestAttempt?.packageId,
      moduleName: artifact.moduleName,
      targetId: "testnet:stillness",
      transactionDigest: result.current.latestAttempt?.confirmationReference,
      deployedAt: new Date(result.current.latestAttempt?.endedAt ?? 0).toISOString(),
      contractName: artifact.moduleName,
    });
  });

  it("clears a persisted deployment snapshot when a new deployment starts", async () => {
    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=1000");
    window.localStorage.setItem("frontier-flow:deployment", JSON.stringify({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "local",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "starter_contract",
    }));

    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });

  it("preserves the real attempt start time when the executor-backed remote path succeeds", async () => {
    vi.setSystemTime(new Date("2026-03-22T12:00:00.000Z"));
    const executeTransactionBlock = vi.fn(() => {
      vi.setSystemTime(new Date("2026-03-22T12:00:01.500Z"));
      return Promise.resolve({ digest: "0xdigest" });
    });
    const waitForTransaction = vi.fn(() => {
      vi.setSystemTime(new Date("2026-03-22T12:00:02.000Z"));
      return Promise.resolve({
        digest: "0xdigest",
        effects: { status: { status: "success" } },
        objectChanges: [{ type: "published", packageId: "0xabc123" }],
      });
    });
    mockUseSuiClient.mockReturnValue({
      executeTransactionBlock,
      waitForTransaction,
    } as unknown as SuiClient);
    window.history.replaceState({}, "", "/");

    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    expect(mockSignTransaction).toHaveBeenCalledTimes(1);
    expect(result.current.latestAttempt?.startedAt).toBe(Date.parse("2026-03-22T12:00:00.000Z"));
    expect(result.current.latestAttempt?.endedAt).toBe(Date.parse("2026-03-22T12:00:02.000Z"));
  });
});