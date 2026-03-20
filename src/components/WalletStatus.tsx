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

interface WalletActionButtonProps {
  readonly children: string;
  readonly className: string;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

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

function WalletActionButton({ children, className, disabled = false, onClick }: WalletActionButtonProps) {
  return (
    <button className={className} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function ConnectedWalletStatus({
  address,
  balanceLabel,
  buttonClassName,
  disconnectPending,
  onDisconnect,
}: {
  readonly address: string;
  readonly balanceLabel: string;
  readonly buttonClassName: string;
  readonly disconnectPending: boolean;
  readonly onDisconnect: () => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-2">
      <div className="flex min-w-0 items-center gap-3 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] px-3 py-2">
        <span className="hidden font-heading text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brand-orange)] sm:block">
          Wallet
        </span>
        <span className="truncate font-heading text-sm uppercase tracking-[0.12em] text-[var(--cream-white)]">
          {formatAddress(address)}
        </span>
        <div className="h-4 w-px bg-[var(--ui-border-dark)]" />
        <span
          aria-live="polite"
          className="whitespace-nowrap text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]"
        >
          {balanceLabel}
        </span>
      </div>

      <WalletActionButton className={buttonClassName} onClick={onDisconnect}>
        {disconnectPending ? "Disconnecting" : "Disconnect"}
      </WalletActionButton>
    </div>
  );
}

function WalletHelpStatus({
  buttonClassName,
  showWalletHelp,
  onToggleHelp,
}: {
  readonly buttonClassName: string;
  readonly showWalletHelp: boolean;
  readonly onToggleHelp: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <WalletActionButton className={buttonClassName} onClick={onToggleHelp}>
        {showWalletHelp ? "Hide Help" : "Connect"}
      </WalletActionButton>
      {showWalletHelp ? (
        <div className="absolute right-4 top-full z-50 mt-2 max-w-[18rem] border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.95)] p-3 shadow-xl backdrop-blur-md">
          <p className="text-[0.7rem] leading-relaxed text-[var(--text-secondary)]">
            Install a Sui-compatible wallet such as Sui Wallet, Suiet, or Ethos to connect.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ConnectTriggerButton({ className }: { readonly className: string }) {
  return <WalletActionButton className={className}>Connect</WalletActionButton>;
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
  const primaryButtonClassName = `${sharedButtonClassName} border-[var(--brand-orange)] bg-transparent text-[var(--brand-orange)] hover:bg-[rgba(255,71,0,0.1)]`;
  const disconnectButtonClassName = `${sharedButtonClassName} border-[var(--brand-orange)] bg-[var(--brand-orange)] text-[var(--text-dark)] hover:bg-[var(--brand-dark)]`;
  const disabledButtonClassName = `${sharedButtonClassName} border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] text-[var(--text-secondary)]`;

  if (account !== null) {
    const balanceLabel = balanceQuery.isPending
      ? "Loading..."
      : balanceQuery.isError
        ? "-- SUI"
        : formatBalance(balanceQuery.data.totalBalance);

    return (
      <ConnectedWalletStatus
        address={account.address}
        balanceLabel={balanceLabel}
        buttonClassName={disconnectButtonClassName}
        disconnectPending={disconnectWallet.isPending}
        onDisconnect={() => {
          disconnectWallet.mutate();
        }}
      />
    );
  }

  if (currentWallet.isConnecting) {
    return (
      <WalletActionButton className={disabledButtonClassName} disabled={true}>
        Connecting
      </WalletActionButton>
    );
  }

  if (wallets.length === 0) {
    return (
      <WalletHelpStatus
        buttonClassName={primaryButtonClassName}
        onToggleHelp={() => {
          setShowWalletHelp(!showWalletHelp);
        }}
        showWalletHelp={showWalletHelp}
      />
    );
  }

  return (
    <ConnectModal
      trigger={
        <ConnectTriggerButton className={primaryButtonClassName} />
      }
    />
  );
}

export default WalletStatus;