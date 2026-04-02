import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useDisconnectWallet as useDisconnectWalletHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import WalletStatus from "../components/WalletStatus";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type DisconnectWallet = ReturnType<typeof useDisconnectWalletHook>;
type Wallets = ReturnType<typeof useWalletsHook>;
type ResolvedWalletCharacterIdentity = import("../utils/characterProfile").ResolvedWalletCharacterIdentity;
type TargetBalanceQuery = ReturnType<typeof import("../hooks/useTargetBalance").useTargetBalance>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseDisconnectWallet = vi.fn<() => DisconnectWallet>();
const mockUseWallets = vi.fn<() => Wallets>();
const mockUseTargetBalance = vi.fn<(...args: [string | null, import("../compiler/types").DeploymentTargetId]) => TargetBalanceQuery>();
const mockFetchCharacterIdentityForWalletAcrossTargets = vi.fn<typeof import("../utils/characterProfile").fetchCharacterIdentityForWalletAcrossTargets>();
const mockRefreshPublishedWorldPackageManifest = vi.fn<typeof import("../data/packageReferences").refreshPublishedWorldPackageManifest>();

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

function createDisconnectMutation(mutate = vi.fn()): DisconnectWallet {
  return {
    isPending: false,
    mutate,
  } as unknown as DisconnectWallet;
}

function createBalanceQuery(overrides: Partial<TargetBalanceQuery> = {}): TargetBalanceQuery {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    ...overrides,
  } as unknown as TargetBalanceQuery;
}

vi.mock("@mysten/dapp-kit", () => ({
  ConnectModal: ({ trigger }: { trigger: ReactNode }) => <>{trigger}</>,
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useDisconnectWallet: () => mockUseDisconnectWallet(),
  useWallets: () => mockUseWallets(),
}));

vi.mock("../hooks/useTargetBalance", () => ({
  useTargetBalance: (...args: Parameters<typeof import("../hooks/useTargetBalance").useTargetBalance>) => mockUseTargetBalance(...args),
}));

vi.mock("../utils/characterProfile", () => ({
  fetchCharacterIdentityForWalletAcrossTargets: (...args: Parameters<typeof mockFetchCharacterIdentityForWalletAcrossTargets>) =>
    mockFetchCharacterIdentityForWalletAcrossTargets(...args),
}));

vi.mock("../data/packageReferences", async () => {
  const actual = await vi.importActual<typeof import("../data/packageReferences")>("../data/packageReferences");

  return {
    ...actual,
    refreshPublishedWorldPackageManifest: (...args: Parameters<typeof mockRefreshPublishedWorldPackageManifest>) =>
      mockRefreshPublishedWorldPackageManifest(...args),
  };
});

const connectedAccount = {
  address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  chains: [],
  features: [],
  icon: undefined,
  label: undefined,
  publicKey: new Uint8Array(),
};

describe("WalletStatus", () => {
  beforeEach(() => {
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue(createDisconnectedWalletState());
    mockUseDisconnectWallet.mockReturnValue(createDisconnectMutation());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery());
    mockUseWallets.mockReturnValue([availableWallet]);
    mockFetchCharacterIdentityForWalletAcrossTargets.mockReset();
    mockFetchCharacterIdentityForWalletAcrossTargets.mockImplementation(() => new Promise(() => undefined));
    mockRefreshPublishedWorldPackageManifest.mockReset();
    mockRefreshPublishedWorldPackageManifest.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the disconnected connect action when wallets are available", () => {
    render(<WalletStatus />);

    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  it("treats an undefined current account as disconnected", () => {
    mockUseCurrentAccount.mockReturnValue(undefined as unknown as CurrentAccount);

    render(<WalletStatus />);

    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  it("shows wallet guidance after clicking connect with no installed wallets", () => {
    mockUseWallets.mockReturnValue([]);

    render(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByText(/No compatible Sui wallet was detected in this browser/i)).toBeVisible();
    expect(screen.getByText(/If EVE Vault is already installed, unlock it and refresh the page/i)).toBeVisible();
  });

  it("renders the connected wallet address and balance", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "12500000000" },
    }));

    render(<WalletStatus />);

    expect(screen.getByText("0x1234...cdef")).toBeVisible();
    expect(screen.getByText("12.5 SUI")).toBeVisible();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeVisible();
  });

  it("renders zero balances without collapsing the value", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "0" },
    }));

    render(<WalletStatus />);

    expect(screen.getByText("0 SUI")).toBeVisible();
  });

  it("falls back to a placeholder balance when the query fails", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      isError: true,
    }));

    render(<WalletStatus />);

    expect(screen.getByText("-- SUI")).toBeVisible();
  });

  it("disconnects and clears wallet information from the header state", () => {
    const mutate = vi.fn();

    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseDisconnectWallet.mockReturnValue(createDisconnectMutation(mutate));
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "5000000000" },
    }));

    const { rerender } = render(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(mutate).toHaveBeenCalledTimes(1);

    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue(createDisconnectedWalletState());
    rerender(<WalletStatus />);

    expect(screen.queryByText("0x1234...cdef")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  it("renders a restored connected state on the first paint", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "1000000000" },
    }));

    render(<WalletStatus />);

    expect(screen.getByText("0x1234...cdef")).toBeVisible();
    expect(screen.getByText("1 SUI")).toBeVisible();
  });

  it("falls back cleanly when a previously available wallet is no longer present", () => {
    mockUseWallets.mockReturnValue([]);

    render(<WalletStatus />);

    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
    expect(screen.queryByText("0x1234...cdef")).not.toBeInTheDocument();
  });

  it("renders the character name even when the selected target is local by falling back across published worlds", async () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "3000000000" },
    }));
    mockFetchCharacterIdentityForWalletAcrossTargets.mockResolvedValue({
      characterName: "Capsuleer One",
      targetId: "testnet:stillness",
    } satisfies ResolvedWalletCharacterIdentity);

    render(<WalletStatus selectedDeploymentTarget="local" />);

    expect(await screen.findByText("Capsuleer One")).toBeVisible();
    expect(screen.getByText("3 SUI")).toBeVisible();
    expect(mockRefreshPublishedWorldPackageManifest).toHaveBeenCalled();
    expect(mockFetchCharacterIdentityForWalletAcrossTargets).toHaveBeenCalledWith(expect.objectContaining({
      preferredTargetId: "local",
      walletAddress: connectedAccount.address,
    }));
  });

  it("queries the wallet balance against the selected deployment target", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "3000000000" },
    }));

    render(<WalletStatus selectedDeploymentTarget="local" />);

    expect(mockUseTargetBalance).toHaveBeenCalledWith(connectedAccount.address, "local");
  });

  it("notifies the app when Vault resolves the connected wallet to a published world", async () => {
    const onDetectedDeploymentTarget = vi.fn();

    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "3000000000" },
    }));
    mockFetchCharacterIdentityForWalletAcrossTargets.mockResolvedValue({
      characterName: "Capsuleer One",
      targetId: "testnet:utopia",
    } satisfies ResolvedWalletCharacterIdentity);

    render(<WalletStatus onDetectedDeploymentTarget={onDetectedDeploymentTarget} selectedDeploymentTarget="local" />);

    expect(await screen.findByText("Capsuleer One")).toBeVisible();
    expect(onDetectedDeploymentTarget).toHaveBeenCalledWith("testnet:utopia");
  });

  it("does not block character resolution on the manifest refresh", async () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "3000000000" },
    }));
    mockRefreshPublishedWorldPackageManifest.mockImplementation(() => new Promise(() => undefined));
    mockFetchCharacterIdentityForWalletAcrossTargets.mockResolvedValue({
      characterName: "Capsuleer One",
      targetId: "testnet:stillness",
    } satisfies ResolvedWalletCharacterIdentity);

    render(<WalletStatus selectedDeploymentTarget="local" />);

    expect(await screen.findByText("Capsuleer One")).toBeVisible();
  });

  it("skips the manifest refresh when package references were already verified today", async () => {
    window.localStorage.setItem("frontier-flow:world-package-overrides", JSON.stringify({
      version: 3,
      lastVerifiedOn: new Date().toISOString().slice(0, 10),
      source: "https://example.test/Published.toml",
      targets: {
        "testnet:stillness": {
          worldPackageId: "0xbbb",
          originalWorldPackageId: "0xbbb",
          toolchainVersion: "1.69.1",
        },
      },
    }));

    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "3000000000" },
    }));
    mockFetchCharacterIdentityForWalletAcrossTargets.mockResolvedValue({
      characterName: "Capsuleer One",
      targetId: "testnet:stillness",
    } satisfies ResolvedWalletCharacterIdentity);

    render(<WalletStatus selectedDeploymentTarget="local" />);

    expect(await screen.findByText("Capsuleer One")).toBeVisible();
    expect(mockRefreshPublishedWorldPackageManifest).not.toHaveBeenCalled();
  });
});