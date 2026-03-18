import logoUrl from "../../assets/favicon@32px.png";
import WalletStatus from "./WalletStatus";

export type PrimaryView = "visual" | "move";

interface HeaderProps {
  readonly isCompiling?: boolean;
  readonly onBuild?: () => void;
  readonly activeView?: PrimaryView;
  readonly onViewChange?: (view: PrimaryView) => void;
}

function Header({ isCompiling = false, onBuild, activeView = "visual", onViewChange }: HeaderProps) {
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

        {onViewChange ? (
          <nav aria-label="Primary" className="ff-header__nav">
            <button
              aria-current={activeView === "visual" ? "page" : undefined}
              className={`ff-header__nav-button${activeView === "visual" ? " ff-header__nav-button--active" : ""}`}
              onClick={() => {
                onViewChange("visual");
              }}
              type="button"
            >
              Visual
            </button>
            <button
              aria-current={activeView === "move" ? "page" : undefined}
              className={`ff-header__nav-button${activeView === "move" ? " ff-header__nav-button--active" : ""}`}
              onClick={() => {
                onViewChange("move");
              }}
              type="button"
            >
              Move
            </button>
          </nav>
        ) : null}

        <div className="flex shrink-0 items-center gap-2">
          <button
            className="ff-header__button"
            disabled={isCompiling}
            onClick={() => {
              onBuild?.();
            }}
            type="button"
          >
            {isCompiling ? "Building" : "Build"}
          </button>
          <WalletStatus />
        </div>
      </div>
    </header>
  );
}

export default Header;