import { afterEach, describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { getWallets, type Wallet } from "@mysten/wallet-standard";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { createFrontierDAppKit, signTargetTransaction } from "../utils/suiWalletKit";

const OWNER = `0x${"1".repeat(64)}`;
const OBJECT = `0x${"2".repeat(64)}`;
const GAS = `0x${"3".repeat(64)}`;
const DIGEST = "11111111111111111111111111111111";
const cleanups: (() => void)[] = [];

function setEndpoint(rpcUrl: string) {
  saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl });
}

function unresolvedTransaction() {
  const transaction = new Transaction();
  transaction.transferObjects([transaction.object(OBJECT)], OWNER);
  return transaction;
}

function grpcResponse(protobuf: Uint8Array) {
  const trailers = new TextEncoder().encode("grpc-status: 0\r\n");
  const frames = new Uint8Array(10 + protobuf.length + trailers.length);
  const view = new DataView(frames.buffer);
  view.setUint32(1, protobuf.length);
  frames.set(protobuf, 5);
  const offset = 5 + protobuf.length;
  frames[offset] = 128;
  view.setUint32(offset + 1, trailers.length);
  frames.set(trailers, offset + 5);
  return new Response(toBase64(frames), { headers: { "Content-Type": "application/grpc-web-text" } });
}

function serveConstruction({ beforeResponse, malformed = false, failed = false }: {
  readonly beforeResponse?: () => void;
  readonly malformed?: boolean;
  readonly failed?: boolean;
} = {}) {
  const requests: Request[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/sui.rpc.v2.TransactionExecutionService/SimulateTransaction");
    expect(request.headers.get("content-type")).toContain("application/grpc-web");
    expect(request.headers.get("grpc-timeout")).toBe("8000m");
    const text = await request.text();
    expect(text).not.toContain("jsonrpc");
    const frames = fromBase64(text);
    const payloadLength = new DataView(frames.buffer, frames.byteOffset, frames.byteLength).getUint32(1);
    const decoded = GrpcTypes.SimulateTransactionRequest.fromBinary(frames.slice(5, 5 + payloadLength));
    expect(decoded.doGasSelection).toBe(true);
    const transaction = decoded.transaction;
    if (!transaction || transaction.kind?.data.oneofKind !== "programmableTransaction") throw new Error("Missing programmable transaction");
    expect(transaction.sender).toBe(OWNER);
    const inputs = transaction.kind.data.programmableTransaction.inputs;
    expect(inputs[0].objectId).toBe(OBJECT);
    inputs[0] = { kind: GrpcTypes.Input_InputKind.IMMUTABLE_OR_OWNED, objectId: OBJECT, version: 7n, digest: DIGEST };
    transaction.gasPayment = { objects: [{ objectId: GAS, version: 9n, digest: DIGEST }], owner: OWNER, price: 1n, budget: 1000n };
    beforeResponse?.();
    return grpcResponse(GrpcTypes.SimulateTransactionResponse.toBinary(GrpcTypes.SimulateTransactionResponse.create({
      transaction: malformed ? undefined : { transaction, effects: { status: { success: !failed }, epoch: 1n } },
    })));
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, requests };
}

async function connectWallet({ changeGas = false }: { readonly changeGas?: boolean } = {}) {
  const accounts = [{ address: OWNER, publicKey: new Uint8Array(32).fill(1), chains: ["sui:localnet" as const], features: ["sui:signTransaction" as const] }];
  const reviewed: Transaction[] = [];
  const sign = vi.fn(async ({ transaction }: { readonly transaction: { readonly toJSON: () => Promise<string> } }) => {
    const resolved = Transaction.from(await transaction.toJSON());
    reviewed.push(resolved);
    expect(resolved.isFullyResolved()).toBe(true);
    if (changeGas) resolved.setGasBudget(2000);
    // Building without a client proves consent cannot require further endpoint reads.
    return { bytes: toBase64(await resolved.build()), signature: "test-only-signature" };
  });
  const wallet: Wallet = {
    version: "1.0.0", name: "Frontier construction test wallet", icon: "data:image/svg+xml;base64,PHN2Zy8+", chains: ["sui:localnet"], accounts,
    features: {
      "standard:connect": { version: "1.0.0", connect: () => Promise.resolve({ accounts }) },
      "standard:events": { version: "1.0.0", on: () => () => {} },
      "sui:signTransaction": { version: "2.0.0", signTransaction: sign },
    },
  };
  cleanups.push(getWallets().register(wallet));
  const kit = createFrontierDAppKit({ autoConnect: false });
  kit.switchNetwork("localnet");
  cleanups.push(kit.stores.$wallets.subscribe(() => {}));
  const discovered = kit.stores.$wallets.get().find((item) => item.name === wallet.name);
  if (!discovered) throw new Error("Test wallet not discovered");
  await kit.connectWallet({ wallet: discovered });
  return { kit, sign, reviewed };
}

afterEach(() => {
  cleanups.splice(0).reverse().forEach((dispose) => { dispose(); });
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pinned gRPC construction before wallet consent", () => {
  it("resolves real objects and gas through binary gRPC before presenting offline-buildable JSON", async () => {
    setEndpoint("http://127.0.0.1:19000");
    const { requests } = serveConstruction();
    const { kit, sign, reviewed } = await connectWallet();
    const transaction = unresolvedTransaction();
    const result = await signTargetTransaction({ kit, targetId: "local", transaction, isCurrent: () => true });
    expect(sign).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).port).toBe("19000");
    expect(reviewed[0].getData().inputs[0]).toMatchObject({ Object: { ImmOrOwnedObject: { version: "7", objectId: OBJECT } } });
    expect(reviewed[0].getData().gasData).toMatchObject({ budget: "1000", payment: [{ objectId: GAS, version: "9" }] });
    expect(result.bytes).toBe(toBase64(await transaction.build()));
  });

  it("rejects wallet gas modifications without executing or signing again", async () => {
    serveConstruction();
    const { kit, sign } = await connectWallet({ changeGas: true });
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: unresolvedTransaction(), isCurrent: () => true })).rejects.toThrow(/wallet changed.*Nothing was submitted/);
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it("rejects endpoint edits during real construction before consent", async () => {
    setEndpoint("http://127.0.0.1:19000");
    const { requests } = serveConstruction({ beforeResponse: () => { setEndpoint("http://127.0.0.1:19001"); } });
    const { kit, sign } = await connectWallet();
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: unresolvedTransaction(), isCurrent: () => true })).rejects.toThrow(/context changed/);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).port).toBe("19000");
    expect(sign).not.toHaveBeenCalled();
  });

  it.each([{ malformed: true }, { failed: true }])("fails closed before consent on invalid construction response %j", async (mode) => {
    const { fetch } = serveConstruction(mode);
    const { kit, sign } = await connectWallet();
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: unresolvedTransaction(), isCurrent: () => true })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sign).not.toHaveBeenCalled();
  });

  it("cancels pending construction without requesting consent", async () => {
    const { kit, sign } = await connectWallet();
    const controller = new AbortController();
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) throw new Error("Missing transport abort signal");
      signal.addEventListener("abort", () => { reject(signal.reason instanceof Error ? signal.reason : new Error("Cancelled construction")); }, { once: true });
      controller.abort(new Error("Cancelled construction"));
    }));
    vi.stubGlobal("fetch", fetch);
    await expect(signTargetTransaction({ kit, targetId: "local", transaction: unresolvedTransaction(), isCurrent: () => true, signal: controller.signal })).rejects.toThrow(/Cancelled construction/);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sign).not.toHaveBeenCalled();
  });
});
