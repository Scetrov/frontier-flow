import logoUrl from "../../assets/favicon@32px.png";
import WalletStatus from "./WalletStatus";

function Header() {
  return (
    <header className="border-b border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.92)] px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            alt="Frontier Flow"
            className="h-10 w-10 border border-[var(--brand-orange)] bg-[var(--bg-secondary)] object-cover p-1"
            height="40"
            src={logoUrl}
            width="40"
          />
          <div className="min-w-0">
            <p className="font-heading text-[0.65rem] uppercase tracking-[0.32em] text-[var(--brand-orange)]">
              EVE Frontier
            </p>
            <p className="truncate font-heading text-lg uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-xl">
              Frontier Flow
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}

export default Header;