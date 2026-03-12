import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useDisconnectWallet as useDisconnectWalletHook,
  useSuiClientQuery as useSuiClientQueryHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import WalletStatus from "../components/WalletStatus";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type DisconnectWallet = ReturnType<typeof useDisconnectWalletHook>;
type BalanceQuery = ReturnType<typeof useSuiClientQueryHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseDisconnectWallet = vi.fn<() => DisconnectWallet>();
const mockUseSuiClientQuery = vi.fn<() => BalanceQuery>();
const mockUseWallets = vi.fn<() => Wallets>();

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

function createBalanceQuery(overrides: Partial<BalanceQuery> = {}): BalanceQuery {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    ...overrides,
  } as unknown as BalanceQuery;
}

vi.mock("@mysten/dapp-kit", () => ({
  ConnectModal: ({ trigger }: { trigger: ReactNode }) => <>{trigger}</>,
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useDisconnectWallet: () => mockUseDisconnectWallet(),
  useSuiClientQuery: () => mockUseSuiClientQuery(),
  useWallets: () => mockUseWallets(),
}));

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
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery());
    mockUseWallets.mockReturnValue([availableWallet]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the disconnected connect action when wallets are available", () => {
    render(<WalletStatus />);

    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  it("shows wallet guidance after clicking connect with no installed wallets", () => {
    mockUseWallets.mockReturnValue([]);

    render(<WalletStatus />);

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByText(/Install a Sui-compatible wallet/i)).toBeVisible();
  });

  it("renders the connected wallet address and balance", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery({
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
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "0" },
    }));

    render(<WalletStatus />);

    expect(screen.getByText("0 SUI")).toBeVisible();
  });

  it("falls back to a placeholder balance when the query fails", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
    mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery({
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
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery({
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
    mockUseSuiClientQuery.mockReturnValue(createBalanceQuery({
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
});