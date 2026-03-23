import logoUrl from "../../assets/favicon@32px.png";
import type { DeploymentTargetId } from "../compiler/types";
import DeploymentTargetControl from "./DeploymentTargetControl";
import WalletStatus from "./WalletStatus";

export type PrimaryView = "visual" | "move" | "authorize";

interface HeaderProps {
  readonly isCompiling?: boolean;
  readonly isUpgrade?: boolean;
  readonly onBuild?: () => void;
  readonly activeView?: PrimaryView;
  readonly hasAuthorizeAccess?: boolean;
  readonly canDeploy?: boolean;
  readonly isDeploying?: boolean;
  readonly onDeploy?: () => void;
  readonly onDeploymentTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedDeploymentTarget?: DeploymentTargetId;
  readonly onViewChange?: (view: PrimaryView) => void;
}

interface HeaderActionsProps {
  readonly canDeploy: boolean;
  readonly isBuildDisabled: boolean;
  readonly isCompiling: boolean;
  readonly isDeploying: boolean;
  readonly isUpgrade: boolean;
  readonly onBuild?: () => void;
  readonly onDeploy?: () => void;
  readonly onDeploymentTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
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

function ViewNavigation({
  activeView,
  canAuthorize,
  onViewChange,
}: {
  readonly activeView: PrimaryView;
  readonly canAuthorize: boolean;
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
      <NavigationButton
        active={activeView === "move"}
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
      />
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

function HeaderActions({
  canDeploy,
  isBuildDisabled,
  isCompiling,
  isDeploying,
  isUpgrade,
  onBuild,
  onDeploy,
  onDeploymentTargetChange,
  selectedDeploymentTarget,
}: HeaderActionsProps) {
  return (
    <div className="ff-header__actions">
      <DeploymentTargetControl
        canDeploy={canDeploy}
        isDeploying={isDeploying}
        isUpgrade={isUpgrade}
        onDeploy={onDeploy}
        onTargetChange={onDeploymentTargetChange}
        selectedTarget={selectedDeploymentTarget}
      />
      <button
        aria-label={isCompiling ? "Building" : "Build"}
        className="ff-header__button ff-header__button--compact"
        disabled={isBuildDisabled}
        onClick={() => {
          onBuild?.();
        }}
        type="button"
      >
        <span aria-hidden="true" className="ff-header__button-icon">
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3H6.5V6.5H3V3Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 3H13V6.5H9.5V3Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 9.5H6.5V13H3V9.5Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8.3 9.6H10.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M9.4 8.5V10.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M12 9.6H12.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            <path d="M12.4 9.2V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
          </svg>
        </span>
        <span className="ff-header__button-label">{isCompiling ? "Building" : "Build"}</span>
      </button>
      <WalletStatus selectedDeploymentTarget={selectedDeploymentTarget} />
    </div>
  );
}

function Header({
  isCompiling = false,
  isUpgrade = false,
  onBuild,
  activeView = "visual",
  hasAuthorizeAccess = false,
  canDeploy = false,
  isDeploying = false,
  onDeploy,
  onDeploymentTargetChange,
  selectedDeploymentTarget = "local",
  onViewChange,
}: HeaderProps) {
  const isBuildDisabled = isCompiling || onBuild === undefined;

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
          <ViewNavigation activeView={activeView} canAuthorize={hasAuthorizeAccess} onViewChange={onViewChange} />
        ) : null}

        <HeaderActions
          canDeploy={canDeploy}
          isBuildDisabled={isBuildDisabled}
          isCompiling={isCompiling}
          isDeploying={isDeploying}
          isUpgrade={isUpgrade}
          onBuild={onBuild}
          onDeploy={onDeploy}
          onDeploymentTargetChange={onDeploymentTargetChange}
          selectedDeploymentTarget={selectedDeploymentTarget}
        />
      </div>
    </header>
  );
}

export default Header;