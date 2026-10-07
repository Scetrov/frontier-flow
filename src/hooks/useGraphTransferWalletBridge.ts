import { useMemo } from "react";

import type { GraphTransferWalletBridge } from "./useGraphTransfer";
import { useFrontierWalletSession } from "../wallet/hooks";

/** Walrus graph signing stays on testnet even when the deployment target is local. */
export const WALRUS_GRAPH_SIGNING_NETWORK = "testnet" as const;

export function useGraphTransferWalletBridge(): GraphTransferWalletBridge {
  const session = useFrontierWalletSession();
  return useMemo<GraphTransferWalletBridge>(() => ({
    accountAddress: session.account?.address ?? null,
    walletConnected: session.isConnected,
    signAndExecuteTransaction: async (transaction) => {
      if (session.account === null) throw new Error("Connect a wallet before publishing a graph.");
      const result = await session.kit.signAndExecuteTransaction({
        transaction,
        account: session.account,
        network: WALRUS_GRAPH_SIGNING_NETWORK,
      });
      const executed = result.$kind === "Transaction" ? result.Transaction : null;
      if (executed?.status.success !== true || executed.digest.length === 0) {
        throw new Error("Walrus transaction was not confirmed on testnet.");
      }
      return { digest: executed.digest };
    },
  }), [session.account, session.isConnected, session.kit]);
}
