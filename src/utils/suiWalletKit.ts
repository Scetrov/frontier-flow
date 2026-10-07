import { createDAppKit } from "@mysten/dapp-kit-core";
import type { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";

import type { DeploymentTargetId } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { createEndpointAwareLocalSuiClient, getSuiTargetClient } from "./suiTargetClient";

export const WALLET_STORAGE_KEY = "frontier-flow:sui-wallet:v2";
export const LEGACY_WALLET_STORAGE_KEY = "frontier-flow:sui-wallet";

type WalletOptions = Pick<Parameters<typeof createDAppKit>[0], "storage" | "autoConnect">;

/** The legacy Zustand JSON session is not the new kit's colon-delimited format. */
export function requiresWalletReconnect(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(LEGACY_WALLET_STORAGE_KEY) !== null && storage.getItem(WALLET_STORAGE_KEY) === null;
}

export function createFrontierDAppKit(options: WalletOptions = {}) {
  const localClient = createEndpointAwareLocalSuiClient();
  return createDAppKit({
    networks: ["testnet", "localnet"],
    defaultNetwork: "testnet",
    storageKey: WALLET_STORAGE_KEY,
    // Discover registered wallets without introducing a new embedded wallet.
    slushWalletConfig: null,
    createClient: (network) => network === "localnet" ? localClient : getSuiTargetClient("testnet:stillness"),
    ...options,
  });
}

export type FrontierDAppKit = ReturnType<typeof createFrontierDAppKit>;

/** Sign a pinned target snapshot once. Never submit or retry an ambiguous result. */
export async function signTargetTransaction({ kit, targetId, transaction, isCurrent, signal }: {
  readonly kit: FrontierDAppKit;
  readonly targetId: DeploymentTargetId;
  readonly transaction: Transaction;
  readonly isCurrent: () => boolean;
  readonly signal?: AbortSignal;
}) {
  const connection = kit.stores.$connection.get();
  const account = connection.account;
  if (!connection.wallet || !account) throw new Error("Connect a wallet before signing.");
  const target = getDeploymentTarget(targetId);
  const network = target.networkFamily === "local" ? "localnet" : "testnet";
  if (!account.chains.includes(`sui:${network}`)) throw new Error(`The connected wallet account does not support sui:${network}.`);
  const constructionDeadline = AbortSignal.timeout(15_000);
  const constructionSignal = signal ? AbortSignal.any([signal, constructionDeadline]) : constructionDeadline;
  const client = getSuiTargetClient(targetId, {
    timeout: 8_000,
    abort: constructionSignal,
  });
  const assertCurrent = () => {
    signal?.throwIfAborted();
    const current = kit.stores.$connection.get();
    if (!isCurrent() || current.wallet !== connection.wallet || current.account !== account
      || getDeploymentTarget(targetId).rpcUrl !== target.rpcUrl) {
      throw new Error("Wallet or deployment context changed. Review the target and retry explicitly.");
    }
  };
  assertCurrent();
  transaction.setSenderIfNotSet(account.address);
  // toJSON alone resolves intents, not object versions or gas. Fully build on
  // the concrete target before consent; the wallet must not resolve on its own
  // validator or silently replace the reviewed payload (including gas).
  const bytes = await withConstructionAbort(transaction.build({ client }), constructionSignal);
  if (!transaction.isFullyResolved()) throw new Error("Transaction construction did not resolve all inputs and gas.");
  const json = await withConstructionAbort(transaction.toJSON(), constructionSignal);
  assertCurrent();
  const result = await kit.signTransaction({ transaction: json, account, network });
  assertCurrent();
  if (result.bytes !== toBase64(bytes)) {
    throw new Error("The wallet changed the constructed transaction, including inputs or gas. Nothing was submitted. Review the target and retry explicitly.");
  }
  return result;
}

function withConstructionAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortError = () => signal.reason instanceof Error ? signal.reason : new Error("Transaction construction was cancelled.");
    const onAbort = () => { reject(abortError()); };
    if (signal.aborted) {
      // Attach handlers even when already aborted, avoiding a late unhandled rejection.
      void operation.catch(() => {});
      reject(abortError());
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}
