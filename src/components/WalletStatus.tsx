import { useState } from "react";
import {
  ConnectModal,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSuiClientQuery,
  useWallets,
} from "@mysten/dapp-kit";

import { formatAddress } from "../utils/formatAddress";

const MIST_PER_SUI = 1_000_000_000;

/**
 * Formats a MIST-denominated balance string for display in the header.
 */
function formatBalance(balanceMist: string | null | undefined): string {
  if (!balanceMist) {
    return "-- SUI";
  }

  const amount = Number(balanceMist) / MIST_PER_SUI;

  if (!Number.isFinite(amount)) {
    return "-- SUI";
  }

  const trimmed = amount.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  return `${trimmed} SUI`;
}

function WalletStatus() {
  const account = useCurrentAccount();
  const wallets = useWallets();
  const currentWallet = useCurrentWallet();
  const disconnectWallet = useDisconnectWallet();
  const [showWalletHelp, setShowWalletHelp] = useState(false);

  const balanceQuery = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "0x0" },
    { enabled: account !== null, staleTime: 15_000 },
  );

  const sharedButtonClassName =
    "min-h-10 border px-3 py-2 font-heading text-xs uppercase tracking-[0.22em] transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  if (account !== null) {
    const balanceLabel = balanceQuery.isPending
      ? "Loading..."
      : balanceQuery.isError
        ? "-- SUI"
        : formatBalance(balanceQuery.data.totalBalance);

    return (
      <div className="flex max-w-full flex-col items-end gap-2 sm:flex-row sm:items-center">
        <div className="grid min-w-0 gap-1 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] px-3 py-2 text-right">
          <span className="font-heading text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brand-orange)]">
            Wallet
          </span>
          <span className="truncate font-heading text-sm uppercase tracking-[0.12em] text-[var(--cream-white)]">
            {formatAddress(account.address)}
          </span>
          <span
            aria-live="polite"
            className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]"
          >
            {balanceLabel}
          </span>
        </div>

        <button
          className={`${sharedButtonClassName} border-[var(--brand-orange)] bg-[var(--brand-orange)] text-[var(--text-dark)] hover:bg-[var(--brand-dark)]`}
          onClick={() => {
            disconnectWallet.mutate();
          }}
          type="button"
        >
          {disconnectWallet.isPending ? "Disconnecting" : "Disconnect"}
        </button>
      </div>
    );
  }

  if (currentWallet.isConnecting) {
    return (
      <button
        className={`${sharedButtonClassName} border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] text-[var(--text-secondary)]`}
        disabled
        type="button"
      >
        Connecting
      </button>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="flex max-w-[18rem] flex-col items-end gap-2 text-right">
        <button
          className={`${sharedButtonClassName} border-[var(--brand-orange)] bg-transparent text-[var(--brand-orange)] hover:bg-[rgba(255,71,0,0.1)]`}
          onClick={() => {
            setShowWalletHelp(true);
          }}
          type="button"
        >
          Connect
        </button>
        {showWalletHelp ? (
          <p className="max-w-[18rem] text-[0.7rem] text-[var(--text-secondary)]">
            Install a Sui-compatible wallet such as Sui Wallet, Suiet, or Ethos to connect.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <ConnectModal
      trigger={
        <button
          className={`${sharedButtonClassName} border-[var(--brand-orange)] bg-transparent text-[var(--brand-orange)] hover:bg-[rgba(255,71,0,0.1)]`}
          type="button"
        >
          Connect
        </button>
      }
    />
  );
}

export default WalletStatus;