import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import { useDeployment } from "../hooks/useDeployment";
import { createGeneratedArtifactStub } from "./compiler/helpers";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
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
  useWallets: () => mockUseWallets(),
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
    mockUseWallets.mockReturnValue([availableWallet]);
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
});