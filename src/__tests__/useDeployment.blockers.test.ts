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

import { saveLocalEnvironmentConfig } from "../data/localEnvironment";

const {
  mockCreateDeploymentExecutor,
  mockDeploymentExecutor,
} = vi.hoisted(() => ({
  mockCreateDeploymentExecutor: vi.fn(),
  mockDeploymentExecutor: vi.fn(),
}));

vi.mock("../deployment/executor", async () => {
  const actual = await vi.importActual<typeof import("../deployment/executor")>("../deployment/executor");

  return {
    ...actual,
    createDeploymentExecutor: mockCreateDeploymentExecutor,
  };
});

import { useDeployment } from "../hooks/useDeployment";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import {
  ARTIFACT_EMPTY_PUBLISH_PAYLOAD_MESSAGE,
  DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE,
  EMPTY_PUBLISH_PAYLOAD_REMEDIATION,
} from "./deployment/testFactories";

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
    window.localStorage.clear();
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue(createDisconnectedWalletState());
    mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
    mockUseSuiClient.mockReturnValue({} as SuiClient);
    mockUseWallets.mockReturnValue([availableWallet]);
    mockDeploymentExecutor.mockReset();
    mockCreateDeploymentExecutor.mockReset();
    mockCreateDeploymentExecutor.mockReturnValue(mockDeploymentExecutor);
    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=25");
  });

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
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

  it("allows local deployment previews without a connected wallet", () => {
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.canDeploy).toBe(true);
    expect(result.current.blockerReasons).toEqual([]);
  });

  it("requires a connected wallet for local deployment when ephemeral signing is disabled", () => {
    saveLocalEnvironmentConfig(window.localStorage, {
      rpcUrl: "http://localhost:9000",
      graphQlUrl: "http://localhost:9125/graphql",
      worldPackageId: "0xabc123",
      worldPackageVersion: "0.0.18",
      useEphemeralKeypair: false,
    });
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    expect(result.current.canDeploy).toBe(false);
    expect(result.current.blockerReasons[0]).toContain(
      "Connect a Sui-compatible wallet before deploying to localnet:0xabc1...",
    );
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
      vi.advanceTimersByTime(150);
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
      vi.advanceTimersByTime(150);
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

  it("surfaces executor-blocked empty publish payloads with actionable remediation", async () => {
    window.history.replaceState({}, "", "/");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockDeploymentExecutor.mockResolvedValueOnce({
      outcome: "blocked",
      stage: "deploy-grade-compile",
      message: DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE,
      remediation: EMPTY_PUBLISH_PAYLOAD_REMEDIATION,
      errorCode: "publish-payload-empty",
    });
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    expect(mockDeploymentExecutor).toHaveBeenCalledTimes(1);
    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.errorCode).toBe("publish-payload-empty");
    expect(result.current.latestAttempt?.message).toBe(DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE);
    expect(result.current.deploymentStatus?.status).toBe("blocked");
    expect(result.current.deploymentStatus?.blockedReasons).toContain(DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE);
    expect(result.current.statusMessage?.headline).toBe("Deployment blocked");
    expect(result.current.statusMessage?.details).toBe(EMPTY_PUBLISH_PAYLOAD_REMEDIATION);
  });

  it("treats artifact-level empty publish payload blockers as blocked-before-submission outcomes", async () => {
    window.history.replaceState({}, "", "/");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockDeploymentExecutor.mockResolvedValueOnce({
      outcome: "blocked",
      stage: "preparing",
      message: ARTIFACT_EMPTY_PUBLISH_PAYLOAD_MESSAGE,
      remediation: EMPTY_PUBLISH_PAYLOAD_REMEDIATION,
      errorCode: "publish-payload-empty",
    });
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(result.current.latestAttempt?.currentStage).toBe("preparing");
    expect(result.current.latestAttempt?.message).toBe(ARTIFACT_EMPTY_PUBLISH_PAYLOAD_MESSAGE);
    expect(result.current.deploymentStatus?.blockedReasons).toContain(ARTIFACT_EMPTY_PUBLISH_PAYLOAD_MESSAGE);
    expect(result.current.statusMessage?.details).toBe(EMPTY_PUBLISH_PAYLOAD_REMEDIATION);
  });

  it("preserves blocked empty-publish history when a later retry succeeds in the same session", async () => {
    window.history.replaceState({}, "", "/");
    mockUseCurrentAccount.mockReturnValue(connectedAccount as CurrentAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockDeploymentExecutor
      .mockResolvedValueOnce({
        outcome: "blocked",
        stage: "deploy-grade-compile",
        message: DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE,
        remediation: EMPTY_PUBLISH_PAYLOAD_REMEDIATION,
        errorCode: "publish-payload-empty",
      })
      .mockResolvedValueOnce({
        outcome: "succeeded",
        stage: "confirming",
        message: "Deployment completed for localnet.",
        packageId: "0xabc123",
        confirmationReference: "0xdigest",
      });
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: { state: "compiled", bytecode: [new Uint8Array([1, 2, 3])], artifact },
    }));

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.status).toBe("deployed");
    expect(result.current.deploymentStatus?.reviewHistory).toHaveLength(2);
    expect(result.current.deploymentStatus?.reviewHistory?.[0]?.outcome).toBe("succeeded");
    expect(result.current.deploymentStatus?.reviewHistory?.[1]?.blockedReasons).toContain(DEPLOY_GRADE_EMPTY_PUBLISH_PAYLOAD_MESSAGE);
  });
});