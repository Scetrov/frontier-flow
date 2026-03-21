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
import { ConservativeConnectIcon } from "./HeaderActionIcons";

const MIST_PER_SUI = 1_000_000_000;

interface WalletActionButtonProps {
  readonly icon: React.ReactNode;
  readonly label: string;
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

function WalletActionButton({ className, disabled = false, icon, label, onClick }: WalletActionButtonProps) {
  return (
    <button aria-label={label} className={className} disabled={disabled} onClick={onClick} type="button">
      <span aria-hidden="true" className="ff-header__button-icon">{icon}</span>
      <span className="ff-header__button-label">{label}</span>
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
    <div className="ff-wallet-status ff-wallet-status--connected">
      <div className="ff-wallet-status__summary flex min-w-0 items-center gap-3 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.85)] px-3 py-2">
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

      <WalletActionButton
        className={buttonClassName}
        icon={(
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4.5H13.5V11.5H10" stroke="currentColor" strokeWidth="1.4" />
            <path d="M7 11.5H2.5V4.5H7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 8H13" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11.2 5.8L13.4 8L11.2 10.2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
        label={disconnectPending ? "Disconnecting" : "Disconnect"}
        onClick={onDisconnect}
      />
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
    <div className="ff-wallet-status ff-wallet-status--help">
      <WalletActionButton
        className={buttonClassName}
        icon={<ConservativeConnectIcon />}
        label={showWalletHelp ? "Hide Help" : "Connect"}
        onClick={onToggleHelp}
      />
      {showWalletHelp ? (
        <div className="absolute right-4 top-full z-50 mt-2 max-w-[18rem] border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.95)] p-3 shadow-xl backdrop-blur-md">
          <p className="text-[0.7rem] leading-relaxed text-[var(--text-secondary)]">
            No compatible Sui wallet was detected in this browser. If EVE Vault is already installed, unlock it and refresh the page. Frontier Flow only connects to wallets that register through the Sui Wallet Standard.
          </p>
        </div>
      ) : null}
    </div>
  );
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
    "ff-header__button ff-header__button--compact ff-wallet-status__action min-h-10 border px-3 py-2 font-heading text-xs uppercase tracking-[0.22em] transition-colors disabled:cursor-not-allowed disabled:opacity-60";
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
      <WalletActionButton
        className={disabledButtonClassName}
        disabled={true}
        icon={(
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" />
            <path d="M8 2.5A5.5 5.5 0 0 1 13.5 8" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
        label="Connecting"
      />
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
        <WalletActionButton
          className={primaryButtonClassName}
          icon={<ConservativeConnectIcon />}
          label="Connect"
        />
      }
    />
  );
}

export default WalletStatus;