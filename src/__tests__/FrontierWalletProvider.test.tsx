import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCurrentAccount, useDAppKit, useWalletConnection, useWallets } from "@mysten/dapp-kit-react";
import { getWallets, type Wallet } from "@mysten/wallet-standard";

import { FrontierWalletProvider } from "../components/FrontierWalletProvider";
import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { createFrontierDAppKit, LEGACY_WALLET_STORAGE_KEY, WALLET_STORAGE_KEY, type FrontierDAppKit } from "../utils/suiWalletKit";

const unregister: (() => void)[] = [];

function WalletSnapshot({ observe }: { readonly observe: (kit: FrontierDAppKit) => void }) {
  const kit = useDAppKit<FrontierDAppKit>();
  const account = useCurrentAccount();
  const connection = useWalletConnection();
  const wallets = useWallets();
  observe(kit);
  return <div data-testid="wallet-snapshot">{connection.status}:{account?.address ?? "none"}:{wallets.map((wallet) => wallet.name).join(",")}</div>;
}

function registerTestWallet() {
  const accounts = [1, 2].map((index) => ({
    address: `0x${String(index).repeat(64)}`,
    publicKey: new Uint8Array(32).fill(index),
    chains: ["sui:testnet" as const, "sui:localnet" as const],
    features: ["sui:signTransaction" as const],
  }));
  const sign = vi.fn();
  const wallet: Wallet = {
    version: "1.0.0",
    name: "Frontier React lifecycle test wallet",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    chains: ["sui:testnet", "sui:localnet"],
    accounts,
    features: {
      "standard:connect": { version: "1.0.0", connect: () => Promise.resolve({ accounts }) },
      "standard:events": { version: "1.0.0", on: () => () => {} },
      "sui:signTransaction": { version: "2.0.0", signTransaction: sign },
    },
  };
  unregister.push(getWallets().register(wallet));
  return { wallet, sign };
}

afterEach(() => {
  cleanup();
  unregister.splice(0).reverse().forEach((dispose) => { dispose(); });
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Frontier React wallet provider", () => {
  it("requests explicit legacy reconnect without deleting sessions or graphs", () => {
    window.localStorage.setItem(LEGACY_WALLET_STORAGE_KEY, "legacy-session");
    window.localStorage.setItem("saved-graph-fixture", "keep");
    const kit = createFrontierDAppKit({ autoConnect: false });
    render(<FrontierWalletProvider instance={kit}><WalletSnapshot observe={() => {}} /></FrontierWalletProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Use Connect to reconnect");
    expect(screen.getByRole("status")).toHaveTextContent("reconnecting does not authorize signing");
    expect(window.localStorage.getItem(LEGACY_WALLET_STORAGE_KEY)).toBe("legacy-session");
    expect(window.localStorage.getItem("saved-graph-fixture")).toBe("keep");
  });

  it("does not show a legacy warning for a stored v2 session", () => {
    window.localStorage.setItem(LEGACY_WALLET_STORAGE_KEY, "legacy-session");
    window.localStorage.setItem(WALLET_STORAGE_KEY, "new-session");
    render(<FrontierWalletProvider instance={createFrontierDAppKit({ autoConnect: false })}>content</FrontierWalletProvider>);
    expect(screen.queryByText(/Use Connect to reconnect/)).not.toBeInTheDocument();
  });

  it("renders real discovery, connection, account changes and disconnect without signing", async () => {
    window.localStorage.setItem(LEGACY_WALLET_STORAGE_KEY, "legacy-session");
    const { wallet, sign } = registerTestWallet();
    const kit = createFrontierDAppKit({ autoConnect: false });
    render(<FrontierWalletProvider instance={kit}><WalletSnapshot observe={() => {}} /></FrontierWalletProvider>);
    await waitFor(() => { expect(screen.getByTestId("wallet-snapshot")).toHaveTextContent(wallet.name); });
    const discovered = kit.stores.$wallets.get().find((item) => item.name === wallet.name);
    if (!discovered) throw new Error("Missing registered test wallet");
    await act(async () => { await kit.connectWallet({ wallet: discovered }); });
    expect(screen.queryByText(/Use Connect to reconnect/)).not.toBeInTheDocument();
    expect(screen.getByTestId("wallet-snapshot")).toHaveTextContent(`connected:0x${"1".repeat(64)}`);
    const second = kit.stores.$connection.get().wallet?.accounts[1];
    if (!second) throw new Error("Missing second account");
    act(() => { kit.switchAccount({ account: second }); });
    expect(screen.getByTestId("wallet-snapshot")).toHaveTextContent(second.address);
    await act(async () => { await kit.disconnectWallet(); });
    expect(screen.getByText(/disconnected:none/)).toBeInTheDocument();
    expect(screen.getByText(/Use Connect to reconnect/)).toBeInTheDocument();
    expect(sign).not.toHaveBeenCalled();
  });

  it("keeps the React kit and wallet client stable across rerenders and endpoint edits", () => {
    const observed: FrontierDAppKit[] = [];
    const observe = (kit: FrontierDAppKit) => { observed.push(kit); };
    const view = render(<FrontierWalletProvider><WalletSnapshot observe={observe} /></FrontierWalletProvider>);
    const kit = observed[0];
    const client = kit.getClient("localnet");
    const firstCore = client.core;
    act(() => { saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl: "http://127.0.0.1:19001" }); });
    view.rerender(<FrontierWalletProvider><WalletSnapshot observe={observe} /></FrontierWalletProvider>);
    expect(observed.every((item) => item === kit)).toBe(true);
    expect(kit.getClient("localnet")).toBe(client);
    expect(client.core).not.toBe(firstCore);
  });

  it("keeps the provider usable when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    render(<FrontierWalletProvider instance={createFrontierDAppKit({ autoConnect: false, storage: null })}>Wallet discovery available</FrontierWalletProvider>);
    expect(screen.getByText("Wallet discovery available")).toBeInTheDocument();
    expect(screen.queryByText(/Use Connect to reconnect/)).not.toBeInTheDocument();
  });
});
