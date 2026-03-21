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
    expect(result.current.deploymentStatus?.status).toBe("deployed");
    expect(result.current.deploymentStatus?.targetId).toBe("testnet:stillness");
    expect(result.current.statusMessage?.headline).toBe("Deployed");
  });
});