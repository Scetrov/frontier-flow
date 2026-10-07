import { useState } from "react";
import { useCurrentAccount, useDAppKit, useWalletConnection, useWallets } from "@mysten/dapp-kit-react";

import type { FrontierDAppKit } from "../utils/suiWalletKit";

/** Stable gRPC wallet session. Endpoint edits must not recreate this kit. */
export function useFrontierWalletSession() {
  const account = useCurrentAccount();
  const connection = useWalletConnection();
  const wallets = useWallets();
  const kit = useDAppKit<FrontierDAppKit>();
  const [disconnectPending, setDisconnectPending] = useState(false);

  return {
    account,
    wallets,
    kit,
    isConnected: connection.isConnected,
    isConnecting: connection.isConnecting || connection.isReconnecting,
    disconnectPending,
    disconnect() {
      setDisconnectPending(true);
      void kit.disconnectWallet().finally(() => {
        setDisconnectPending(false);
      });
    },
    connect(wallet: (typeof wallets)[number]) {
      return kit.connectWallet({ wallet });
    },
  };
}
