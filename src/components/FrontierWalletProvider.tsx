import { useState, type ReactNode } from "react";
import { DAppKitProvider, useWalletConnection } from "@mysten/dapp-kit-react";

import {
  createFrontierDAppKit,
  requiresWalletReconnect,
  type FrontierDAppKit,
} from "../utils/suiWalletKit";

function needsReconnect(): boolean {
  try {
    return requiresWalletReconnect(window.localStorage);
  } catch {
    // Storage may be disabled. Discovery and explicit connection still work.
    return false;
  }
}

function LegacyWalletReconnectNotice({ required }: { readonly required: boolean }) {
  const connection = useWalletConnection();
  if (!required || connection.isConnected) return null;

  return (
    <p className="border border-[var(--ui-border-dark)] px-3 py-2 text-sm text-[var(--text-secondary)]" role="status">
      Wallet integration updated. Use Connect to reconnect your Sui wallet. Saved graphs are unchanged; reconnecting does not authorize signing.
    </p>
  );
}

/** A stable wallet session; endpoint edits must not recreate the kit or force reconnect. */
export function FrontierWalletProvider({ children, instance }: {
  readonly children: ReactNode;
  readonly instance?: FrontierDAppKit;
}) {
  const [kit] = useState(() => instance ?? createFrontierDAppKit());
  const [reconnectRequired] = useState(needsReconnect);

  return (
    <DAppKitProvider dAppKit={kit}>
      <LegacyWalletReconnectNotice required={reconnectRequired} />
      {children}
    </DAppKitProvider>
  );
}
