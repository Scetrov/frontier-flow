import logoUrl from "../../assets/favicon@32px.png";
import WalletStatus from "./WalletStatus";

export type PrimaryView = "visual" | "move" | "deploy" | "authorize";

interface HeaderProps {
  readonly activeView?: PrimaryView;
  readonly canAccessDeploy?: boolean;
  readonly canAccessMove?: boolean;
  readonly hasAuthorizeAccess?: boolean;
  readonly isCompiling?: boolean;
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly selectedDeploymentTarget?: "local" | "testnet:stillness" | "testnet:utopia";
}

interface HeaderActionsProps {
  readonly selectedDeploymentTarget: "local" | "testnet:stillness" | "testnet:utopia";
}

interface NavigationButtonProps {
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly tooltip?: string;
}

function NavigationButton({ active, disabled = false, icon, label, onClick, tooltip }: NavigationButtonProps) {
  const className = [
    "ff-header__nav-button",
    active ? "ff-header__nav-button--active" : "",
    disabled ? "ff-header__nav-button--disabled" : "",
  ].filter(Boolean).join(" ");

  const button = (
    <button
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled ? true : undefined}
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
      type="button"
    >
      <span aria-hidden="true" className="ff-header__nav-icon">
        {icon}
      </span>
      <span className="ff-header__nav-label">{label}</span>
    </button>
  );

  return tooltip ? <span title={tooltip}>{button}</span> : button;
}

function WorkflowSeparator() {
  return <span aria-hidden="true" className="ff-header__nav-label text-[0.8rem] text-[var(--text-secondary)]">▶</span>;
}

function ViewNavigation({
  activeView,
  canAccessDeploy,
  canAccessMove,
  canAuthorize,
  isCompiling,
  onViewChange,
}: {
  readonly activeView: PrimaryView;
  readonly canAccessDeploy: boolean;
  readonly canAccessMove: boolean;
  readonly canAuthorize: boolean;
  readonly isCompiling: boolean;
  readonly onViewChange: (view: PrimaryView) => void;
}) {
  return (
    <nav aria-label="Primary" className="ff-header__nav">
      <NavigationButton
        active={activeView === "visual"}
        icon={(
          <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
            <circle cx="3" cy="3" fill="currentColor" r="1.5" />
            <circle cx="15" cy="3" fill="currentColor" r="1.5" />
            <circle cx="9" cy="11" fill="currentColor" r="1.5" />
            <path d="M4.25 3H13.75M4.2 4.2L7.8 9.8M13.8 4.2L10.2 9.8" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
        label="Visual"
        onClick={() => {
          onViewChange("visual");
        }}
      />
      <WorkflowSeparator />
      <NavigationButton
        active={activeView === "move"}
        disabled={!canAccessMove}
        icon={(
          <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2L2.5 7L6 12" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 2L15.5 7L12 12" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 1.5L8 12.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        )}
        label="Move"
        onClick={() => {
          onViewChange("move");
        }}
        tooltip={!canAccessMove ? (isCompiling ? "Automatic compile is in progress" : "Automatic compile will unlock Move after the current graph settles") : undefined}
      />
      <WorkflowSeparator />
      <NavigationButton
        active={activeView === "deploy"}
        disabled={!canAccessDeploy}
        icon={(
          <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 1.5V9.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M5.8 6.6L9 9.8L12.2 6.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M3 12H15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
          </svg>
        )}
        label="Deploy"
        onClick={() => {
          onViewChange("deploy");
        }}
        tooltip={!canAccessDeploy ? (isCompiling ? "Automatic compile is in progress" : "Compile the current graph before reviewing deploy checks") : undefined}
      />
      <WorkflowSeparator />
      <NavigationButton
        active={activeView === "authorize"}
        disabled={!canAuthorize}
        icon={(
          <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 1.4L14.5 3.5V6.8C14.5 10 12.15 12.3 9 12.9C5.85 12.3 3.5 10 3.5 6.8V3.5L9 1.4Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 5.1V8.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <circle cx="9" cy="9.9" fill="currentColor" r="0.8" />
          </svg>
        )}
        label="Authorize"
        onClick={() => {
          onViewChange("authorize");
        }}
        tooltip={!canAuthorize ? "Deploy a contract first" : undefined}
      />
    </nav>
  );
}

function HeaderActions({ selectedDeploymentTarget }: HeaderActionsProps) {
  return (
    <div className="ff-header__actions">
      <WalletStatus selectedDeploymentTarget={selectedDeploymentTarget} />
    </div>
  );
}

function Header({
  activeView = "visual",
  canAccessDeploy = false,
  canAccessMove = false,
  hasAuthorizeAccess = false,
  isCompiling = false,
  onViewChange,
  selectedDeploymentTarget = "local",
}: HeaderProps) {
  return (
    <header className="relative z-40 border-b border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.92)] px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="ff-header__bar">
        <div className="ff-header__identity flex min-w-0 items-center gap-3">
          <img
            alt="Frontier Flow"
            className="ff-header__logo h-10 w-10 border border-[var(--brand-orange)] bg-[var(--bg-secondary)] object-cover p-1"
            height="40"
            src={logoUrl}
            width="40"
          />
          <div className="ff-header__brand-copy min-w-0">
            <p className="ff-header__eyebrow font-heading text-[0.65rem] uppercase tracking-[0.32em] text-[var(--brand-orange)]">
              EVE Frontier
            </p>
            <p className="ff-header__title truncate font-heading text-lg uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-xl">
              Frontier Flow
            </p>
          </div>
        </div>

        {onViewChange ? (
          <ViewNavigation
            activeView={activeView}
            canAccessDeploy={canAccessDeploy}
            canAccessMove={canAccessMove}
            canAuthorize={hasAuthorizeAccess}
            isCompiling={isCompiling}
            onViewChange={onViewChange}
          />
        ) : null}

        <HeaderActions selectedDeploymentTarget={selectedDeploymentTarget} />
      </div>
    </header>
  );
}

export default Header;