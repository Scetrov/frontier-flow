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

function createDisconnectedWalletState(): CurrentWallet {
  return {
    connectionStatus: "disconnected",
    currentWallet: null,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    supportedIntents: [],
  } as unknown as CurrentWallet;
}

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

const connectedAccount = {
  address: "0x1234",
  chains: [],
  features: [],
  icon: undefined,
  label: undefined,
  publicKey: new Uint8Array(),
};

describe("useDeployment blocker handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue(createDisconnectedWalletState());
    mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
    mockUseSuiClient.mockReturnValue({} as SuiClient);
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

  it("blocks deployment when the current graph has no fresh compiled artifact", async () => {
    const { result } = renderHook(() => useDeployment({ initialTarget: "local", status: { state: "idle" } }));

    expect(result.current.canDeploy).toBe(false);
    expect(result.current.blockerReasons).toContain(
      "Rebuild the current graph before deployment. The active artifact is stale or unresolved.",
    );

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.errorCode).toBe("stale-artifact");
    expect(result.current.isProgressModalOpen).toBe(true);
    expect(result.current.progress?.activeMessage).toBe(
      "Rebuild the current graph before deployment. The active artifact is stale or unresolved.",
    );
  });

  it("blocks testnet deployment when a wallet is not connected", async () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.blockerReasons).toContain(
      "Connect a Sui-compatible wallet before deploying to testnet:stillness.",
    );

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.errorCode).toBe("wallet-required");
  });

  it("reports wallet detection failures without telling the user to install another wallet", async () => {
    mockUseWallets.mockReturnValue([]);
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.blockerReasons).toContain(
      "No compatible Sui wallet was detected before deploying to testnet:stillness.",
    );

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.statusMessage?.details).toBe(
      "Unlock or refresh a wallet that supports the Sui Wallet Standard, connect it for testnet:stillness, then retry deployment.",
    );
  });

  it("blocks published targets when package reference validation fails", () => {
    window.history.replaceState({}, "", "/?ff_mock_invalid_package_refs=1");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:utopia",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.canDeploy).toBe(false);
    expect(result.current.blockerReasons).toContain(
      "Published package references for testnet:utopia are invalid or unavailable.",
    );
  });

  it("blocks local deployment when the local target is unavailable", async () => {
    window.history.replaceState({}, "", "/?ff_local_deploy_ready=0");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.blockerReasons).toContain("The local validator required for local deployment is unavailable.");

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.errorCode).toBe("local-target-unavailable");
  });

  it("blocks local deployment when a wallet is not connected", async () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.blockerReasons).toContain(
      "Connect a Sui-compatible wallet before deploying to local.",
    );

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.errorCode).toBe("wallet-required");
  });

  it("updates deployment status previews when the selected target changes before deployment", () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    act(() => {
      result.current.setSelectedTarget("testnet:stillness");
    });

    expect(result.current.deploymentStatus?.targetId).toBe("testnet:stillness");
    expect(result.current.deploymentStatus?.status).toBe("blocked");
    expect(result.current.deploymentStatus?.blockedReasons).toContain(
      "Connect a Sui-compatible wallet before deploying to testnet:stillness.",
    );
    expect(result.current.deploymentStatus?.nextActionSummary).toBe(
      "Connect and approve a Sui-compatible wallet for testnet:stillness, then retry deployment.",
    );
  });

  it("marks rejected wallet approval as a cancelled deployment", async () => {
    window.history.replaceState({}, "", "/?ff_mock_deploy_reject=1&ff_mock_deploy_stage_delay_ms=25");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.canDeploy).toBe(true);

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.latestAttempt?.outcome).toBe("cancelled");
    expect(result.current.latestAttempt?.currentStage).toBe("signing");
    expect(result.current.latestAttempt?.errorCode).toBe("wallet-approval-rejected");
    expect(result.current.statusMessage?.headline).toBe("Deployment cancelled");
    expect(result.current.statusMessage?.details).toMatch(/Approve the wallet signing request to continue deployment/i);
  });

  it("marks mocked submission failures as failed deployments without surfacing success", async () => {
    window.history.replaceState({}, "", "/?ff_mock_deploy_fail=1&ff_mock_deploy_stage_delay_ms=25");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.latestAttempt?.outcome).toBe("failed");
    expect(result.current.latestAttempt?.currentStage).toBe("submitting");
    expect(result.current.latestAttempt?.errorCode).toBe("submission-failed");
    expect(result.current.deploymentStatus?.status).toBe("blocked");
    expect(result.current.deploymentStatus?.outcome).toBe("failed");
    expect(result.current.statusMessage?.headline).toBe("Deployment failed");
  });

  it("marks mocked confirmation timeouts as unresolved deployments without surfacing success", async () => {
    window.history.replaceState({}, "", "/?ff_mock_deploy_unresolved=1&ff_mock_deploy_stage_delay_ms=25");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:utopia",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.latestAttempt?.outcome).toBe("unresolved");
    expect(result.current.latestAttempt?.currentStage).toBe("confirming");
    expect(result.current.latestAttempt?.errorCode).toBe("confirmation-timeout");
    expect(result.current.latestAttempt?.packageId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.latestAttempt?.confirmationReference).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.deploymentStatus?.status).toBe("blocked");
    expect(result.current.deploymentStatus?.outcome).toBe("unresolved");
    expect(result.current.statusMessage?.headline).toBe("Deployment unresolved");
  });
});