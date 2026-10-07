import { afterEach, describe, expect, it, vi } from "vitest";
import { getWallets, type Wallet } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { createFrontierDAppKit, LEGACY_WALLET_STORAGE_KEY, requiresWalletReconnect, signTargetTransaction, WALLET_STORAGE_KEY } from "../utils/suiWalletKit";

const cleanups: (() => void)[] = [];

async function connectTestWallet(chains: `${string}:${string}`[] = ["sui:testnet", "sui:localnet"]) {
  const accounts = [1, 2].map((index) => ({
    address: `0x${String(index).repeat(64)}`,
    publicKey: new Uint8Array(32).fill(index),
    chains,
    features: ["sui:signTransaction" as const],
  }));
  const sign = vi.fn(async ({ transaction }: { transaction: { toJSON: () => Promise<string> } }) => {
    const resolved = Transaction.from(await transaction.toJSON());
    return { bytes: toBase64(await resolved.build()), signature: "test-only-signature" };
  });
  const wallet: Wallet = {
    version: "1.0.0",
    name: "Frontier isolated test wallet",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    chains,
    accounts,
    features: {
      "standard:connect": { version: "1.0.0", connect: () => Promise.resolve({ accounts }) },
      "standard:events": { version: "1.0.0", on: () => () => {} },
      "sui:signTransaction": { version: "2.0.0", signTransaction: sign },
    },
  };
  cleanups.push(getWallets().register(wallet));
  const kit = createFrontierDAppKit({ autoConnect: false });
  cleanups.push(kit.stores.$wallets.subscribe(() => {}));
  const discovered = kit.stores.$wallets.get().find((item) => item.name === wallet.name);
  expect(discovered).toBeDefined();
  if (!discovered) throw new Error("Test wallet was not discovered.");
  await kit.connectWallet({ wallet: discovered });
  return { kit, sign };
}

function setEndpoint(rpcUrl: string) {
  saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl });
}

function serializedTransaction() {
  const transaction = new Transaction();
  transaction.setSender(`0x${"1".repeat(64)}`);
  transaction.setGasPrice(1);
  transaction.setGasBudget(1000);
  transaction.setGasPayment([{ objectId: `0x${"3".repeat(64)}`, version: "1", digest: "11111111111111111111111111111111" }]);
  const serialize = vi.spyOn(transaction, "toJSON");
  const build = vi.spyOn(transaction, "build");
  return { transaction, serialize, build };
}

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => { cleanup(); });
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("gRPC wallet kit lifecycle and signing context", () => {
  it("discovers, connects, changes accounts and disconnects without editing graphs", async () => {
    window.localStorage.setItem("saved-graph-fixture", "keep");
    const { kit } = await connectTestWallet();
    const connected = kit.stores.$connection.get();
    expect(connected.account?.address).toBe(`0x${"1".repeat(64)}`);
    const other = connected.wallet?.accounts[1];
    if (!other) throw new Error("Missing second test account.");
    kit.switchAccount({ account: other });
    expect(kit.stores.$connection.get().account?.address).toBe(other.address);
    await kit.disconnectWallet();
    expect(kit.stores.$connection.get().account).toBeNull();
    expect(window.localStorage.getItem("saved-graph-fixture")).toBe("keep");
  });

  it("keeps kit/wallet identity while refreshing local endpoint handles", async () => {
    const { kit } = await connectTestWallet();
    const wallet = kit.stores.$connection.get().wallet;
    const client = kit.getClient("localnet");
    const oldCore = client.core;
    const testnetClient = kit.getClient("testnet");
    setEndpoint("http://127.0.0.1:19001");
    expect(kit.getClient("localnet")).toBe(client);
    expect(client.core).not.toBe(oldCore);
    expect(kit.getClient("testnet")).toBe(testnetClient);
    expect(kit.stores.$connection.get().wallet).toBe(wallet);
  });

  it("detects legacy reconnect without deleting or interpreting the old session", () => {
    const legacy = JSON.stringify({ state: { lastConnectedWalletName: "Old wallet" }, version: 0 });
    window.localStorage.setItem(LEGACY_WALLET_STORAGE_KEY, legacy);
    expect(requiresWalletReconnect(window.localStorage)).toBe(true);
    window.localStorage.setItem(WALLET_STORAGE_KEY, "New wallet:0x1");
    expect(requiresWalletReconnect(window.localStorage)).toBe(false);
    expect(window.localStorage.getItem(LEGACY_WALLET_STORAGE_KEY)).toBe(legacy);
  });

  it("signs once with explicit chain/account and pinned serialized transaction", async () => {
    const { kit, sign } = await connectTestWallet();
    const { transaction, serialize, build } = serializedTransaction();
    const result = await signTargetTransaction({ kit, targetId: "local", transaction, isCurrent: () => true });
    expect(result.bytes).toBe(toBase64(await Transaction.from(await transaction.toJSON()).build()));
    expect(transaction.isFullyResolved()).toBe(true);
    expect(serialize.mock.calls[0]).toEqual([]);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toMatchObject({ chain: "sui:localnet", account: { address: kit.stores.$connection.get().account?.address } });
    const options = build.mock.calls[0][0];
    expect(options?.client?.network).toBe("localnet");
  });

  it("rejects unsupported wallet chains before serialization or signing", async () => {
    const { kit, sign } = await connectTestWallet(["sui:testnet"]);
    const { transaction, serialize } = serializedTransaction();
    await expect(signTargetTransaction({ kit, targetId: "local", transaction, isCurrent: () => true })).rejects.toThrow(/does not support sui:localnet/);
    expect(serialize).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it("rejects endpoint changes during construction before requesting consent", async () => {
    const { kit, sign } = await connectTestWallet();
    const { transaction, serialize } = serializedTransaction();
    const originalSerialize = transaction.toJSON.bind(transaction);
    serialize.mockImplementationOnce(async () => {
      setEndpoint("http://127.0.0.1:19001");
      return originalSerialize();
    });
    await expect(signTargetTransaction({ kit, targetId: "local", transaction, isCurrent: () => true })).rejects.toThrow(/context changed/);
    expect(sign).not.toHaveBeenCalled();
  });

  it("discards signatures after context changes during consent without resubmission", async () => {
    const { kit, sign } = await connectTestWallet();
    let current = true;
    sign.mockImplementation(() => {
      current = false;
      return Promise.resolve({ bytes: "test-only-bytes", signature: "test-only-signature" });
    });
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: serializedTransaction().transaction, isCurrent: () => current })).rejects.toThrow(/context changed/);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it("rejects aborted requests before requesting signing consent", async () => {
    const { kit, sign } = await connectTestWallet();
    const controller = new AbortController();
    controller.abort();
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: serializedTransaction().transaction, isCurrent: () => true, signal: controller.signal })).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });
});
