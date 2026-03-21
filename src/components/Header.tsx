import logoUrl from "../../assets/favicon@32px.png";
import type { DeploymentTargetId } from "../compiler/types";
import DeploymentTargetControl from "./DeploymentTargetControl";
import WalletStatus from "./WalletStatus";

export type PrimaryView = "visual" | "move";

interface HeaderProps {
  readonly isCompiling?: boolean;
  readonly onBuild?: () => void;
  readonly activeView?: PrimaryView;
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
  readonly onBuild?: () => void;
  readonly onDeploy?: () => void;
  readonly onDeploymentTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

interface NavigationButtonProps {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}

function NavigationButton({ active, label, onClick }: NavigationButtonProps) {
  const className = active ? "ff-header__nav-button ff-header__nav-button--active" : "ff-header__nav-button";

  return (
    <button
      aria-current={active ? "page" : undefined}
      className={className}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ViewNavigation({ activeView, onViewChange }: { readonly activeView: PrimaryView; readonly onViewChange: (view: PrimaryView) => void }) {
  return (
    <nav aria-label="Primary" className="ff-header__nav">
      <NavigationButton
        active={activeView === "visual"}
        label="Visual"
        onClick={() => {
          onViewChange("visual");
        }}
      />
      <NavigationButton
        active={activeView === "move"}
        label="Move"
        onClick={() => {
          onViewChange("move");
        }}
      />
    </nav>
  );
}

function HeaderActions({
  canDeploy,
  isBuildDisabled,
  isCompiling,
  isDeploying,
  onBuild,
  onDeploy,
  onDeploymentTargetChange,
  selectedDeploymentTarget,
}: HeaderActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <DeploymentTargetControl
        canDeploy={canDeploy}
        isDeploying={isDeploying}
        onDeploy={onDeploy}
        onTargetChange={onDeploymentTargetChange}
        selectedTarget={selectedDeploymentTarget}
      />
      <button
        className="ff-header__button"
        disabled={isBuildDisabled}
        onClick={() => {
          onBuild?.();
        }}
        type="button"
      >
        {isCompiling ? "Building" : "Build"}
      </button>
      <WalletStatus />
    </div>
  );
}

function Header({
  isCompiling = false,
  onBuild,
  activeView = "visual",
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
          <ViewNavigation activeView={activeView} onViewChange={onViewChange} />
        ) : null}

        <HeaderActions
          canDeploy={canDeploy}
          isBuildDisabled={isBuildDisabled}
          isCompiling={isCompiling}
          isDeploying={isDeploying}
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