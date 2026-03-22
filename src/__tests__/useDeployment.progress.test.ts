import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSignAndExecuteTransaction as useSignAndExecuteTransactionHook,
  useSuiClient as useSuiClientHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import { useDeployment } from "../hooks/useDeployment";
import { createGeneratedArtifactStub } from "./compiler/helpers";

const mockSignTransaction = vi.fn();

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SignAndExecuteTransaction = ReturnType<typeof useSignAndExecuteTransactionHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseSignAndExecuteTransaction = vi.fn<() => SignAndExecuteTransaction>();
const mockUseSuiClient = vi.fn<() => SuiClient>();
const mockUseWallets = vi.fn<() => Wallets>();
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
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useSignAndExecuteTransaction: () => mockUseSignAndExecuteTransaction(),
  useSuiClient: () => mockUseSuiClient(),
  useWallets: () => mockUseWallets(),
}));

vi.mock("@mysten/wallet-standard", () => ({
  signTransaction: (...args: unknown[]) => mockSignTransaction(...args),
}));

describe("useDeployment progress flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    mockUseSuiClient.mockReturnValue({} as SuiClient);
    mockUseWallets.mockReturnValue([availableWallet]);
    mockSignTransaction.mockResolvedValue({ bytes: "dGVzdA==", signature: "0xsig" });
    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=25");
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

  it("advances through deployment stages in order and completes successfully", async () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.isDeploying).toBe(true);
    expect(result.current.isProgressModalOpen).toBe(true);
    expect(result.current.progress?.stage).toBe("validating");

    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current.progress?.stage).toBe("preparing");

    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current.progress?.stage).toBe("signing");

    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current.progress?.stage).toBe("submitting");

    act(() => {
      vi.advanceTimersByTime(25);
    });

    expect(result.current.progress?.stage).toBe("confirming");
    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.isDeploying).toBe(false);
    expect(result.current.isProgressModalOpen).toBe(true);
  });

  it("allows dismissing the modal while deployment continues to completion", async () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:utopia",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(25);
      result.current.dismissProgress();
    });

    expect(result.current.progress?.dismissedByUser).toBe(true);
    expect(result.current.isProgressModalOpen).toBe(false);

    act(() => {
      vi.advanceTimersByTime(75);
    });

    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.status).toBe("deployed");
    expect(result.current.progress?.dismissedByUser).toBe(true);
    expect(result.current.isProgressModalOpen).toBe(false);
    expect(result.current.isDeploying).toBe(false);
  });

  it("reopens the modal for a new deployment attempt after a previous dismissal", async () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      result.current.dismissProgress();
      vi.advanceTimersByTime(100);
    });

    const firstAttemptId = result.current.latestAttempt?.attemptId;

    expect(firstAttemptId).toBeDefined();
    expect(result.current.progress?.dismissedByUser).toBe(true);
    expect(result.current.isProgressModalOpen).toBe(false);

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.progress?.attemptId).not.toBe(firstAttemptId);
    expect(result.current.progress?.dismissedByUser).toBe(false);
    expect(result.current.isProgressModalOpen).toBe(true);
    expect(result.current.isDeploying).toBe(true);
  });

  it("preserves recent retry history in recency order with artifact identity intact", async () => {
    const artifact = createGeneratedArtifactStub({
      artifactId: "artifact-retry-sequence",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });
    window.history.replaceState({}, "", "/?ff_local_deploy_ready=0&ff_mock_deploy_stage_delay_ms=25");
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.deploymentStatus?.artifactId).toBe("artifact-retry-sequence");
    expect(result.current.deploymentStatus?.reviewHistory).toHaveLength(1);

    act(() => {
      result.current.setSelectedTarget("testnet:stillness");
    });
    window.history.replaceState({}, "", "/?ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=25");

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.artifactId).toBe("artifact-retry-sequence");
    expect(result.current.deploymentStatus?.reviewHistory?.map((entry) => entry.headline)).toEqual([
      "Deployed",
      "Deployment blocked",
    ]);
    expect(result.current.deploymentStatus?.reviewHistory?.map((entry) => entry.artifactId)).toEqual([
      "artifact-retry-sequence",
      "artifact-retry-sequence",
    ]);
  });

  it("marks earlier local evidence as historical only after a local-validator reset", async () => {
    const artifact = createGeneratedArtifactStub({
      artifactId: "artifact-local-history",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });
    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=1&ff_local_chain_id=alpha");
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(4);
    });

    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.reviewHistory?.[0]?.historicalOnly ?? false).toBe(false);

    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=1&ff_local_chain_id=beta");

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(4);
    });

    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.reviewHistory).toHaveLength(2);
    expect(result.current.deploymentStatus?.reviewHistory?.[0]?.historicalOnly ?? false).toBe(false);
    expect(result.current.deploymentStatus?.reviewHistory?.[1]?.historicalOnly).toBe(true);
    expect(result.current.deploymentStatus?.reviewHistory?.[1]?.historicalReason).toBe(
      "Local validator state changed after this attempt. Re-verify this evidence before relying on it.",
    );
  });
});