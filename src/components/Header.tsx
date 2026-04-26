import { Fragment } from "react";

import logoUrl from "../../assets/favicon@32px.png";
import type { DeploymentTargetId } from "../compiler/types";
import type { GitHubAccessState } from "../types/githubAuth";
import { ConservativeGitHubIcon } from "./HeaderActionIcons";
import WalletStatus from "./WalletStatus";

export type PrimaryView = "visual" | "move" | "deploy" | "authorize" | "simulate";

interface HeaderProps {
  readonly activeView?: PrimaryView;
  readonly canAccessDeploy?: boolean;
  readonly canAccessMove?: boolean;
  readonly gitHubAccessState?: GitHubAccessState;
  readonly hasGitHubAuth?: boolean;
  readonly hasAuthorizeAccess?: boolean;
  readonly isCompiling?: boolean;
  readonly onDetectedDeploymentTarget?: (targetId: Exclude<DeploymentTargetId, "local">) => void;
  readonly onGitHubSignIn?: () => void;
  readonly onGitHubSignOut?: () => void;
  readonly onStartTutorial?: () => void;
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly selectedDeploymentTarget?: DeploymentTargetId;
}

interface HeaderActionsProps {
  readonly activeView: PrimaryView;
  readonly gitHubAccessState: GitHubAccessState;
  readonly hasGitHubAuth: boolean;
  readonly onDetectedDeploymentTarget?: (targetId: Exclude<DeploymentTargetId, "local">) => void;
  readonly onGitHubSignIn?: () => void;
  readonly onGitHubSignOut?: () => void;
  readonly onStartTutorial?: () => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

function getGitHubStatusCopy(accessState: GitHubAccessState): {
  readonly actionLabel: string;
  readonly statusLabel: string;
} {
  if (accessState.mode === "authenticating") {
    return {
      actionLabel: "Connecting GitHub",
      statusLabel: "Completing GitHub sign-in for dependency recovery",
    };
  }

  if (accessState.mode === "authenticated") {
    return {
      actionLabel: accessState.loginLabel === null
        ? "Sign out"
        : `Sign out (${accessState.loginLabel})`,
      statusLabel: accessState.lastFailureKind === "rate-limit"
        ? "GitHub access is active, but the dependency host is still rate limiting requests"
        : accessState.loginLabel === null
          ? "GitHub access active for dependency fetches"
          : `GitHub access active as ${accessState.loginLabel}`,
    };
  }

  if (accessState.mode === "reauth-required") {
    return {
      actionLabel: "Reconnect GitHub",
      statusLabel: "GitHub access needs to be renewed before retrying blocked dependency fetches",
    };
  }

  return {
    actionLabel: "Sign in with GitHub",
    statusLabel: accessState.lastFailureKind === "rate-limit"
      ? "Anonymous GitHub access was rate limited"
      : "Anonymous GitHub access is active",
  };
}

function GitHubAuthControl({
  accessState,
  hasGitHubAuth,
  onGitHubSignIn,
  onGitHubSignOut,
}: {
  readonly accessState: GitHubAccessState;
  readonly hasGitHubAuth: boolean;
  readonly onGitHubSignIn?: () => void;
  readonly onGitHubSignOut?: () => void;
}) {
  const { actionLabel, statusLabel } = getGitHubStatusCopy(accessState);
  const shouldRenderStatusLabel = hasGitHubAuth && (
    accessState.mode === "authenticating"
    || accessState.mode === "reauth-required"
    || (accessState.mode === "authenticated" && accessState.lastFailureKind === "rate-limit")
  );
  const disabled = !hasGitHubAuth || accessState.mode === "authenticating";
  const handleClick = accessState.mode === "authenticated" ? onGitHubSignOut : onGitHubSignIn;
  const buttonLabel = hasGitHubAuth ? actionLabel : "GitHub unavailable";
  const title = hasGitHubAuth ? statusLabel : "GitHub auth is not configured for this environment";

  return (
    <div className="flex items-center gap-2">
      {shouldRenderStatusLabel ? (
        <span aria-live="polite" className="hidden max-w-[18rem] truncate font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-secondary)] xl:inline-flex">
          {statusLabel}
        </span>
      ) : null}
      <button
        aria-label={buttonLabel}
        className="ff-header__button ff-header__button--compact ff-header__github-button"
        disabled={disabled}
        onClick={handleClick}
        title={title}
        type="button"
      >
        <span aria-hidden="true" className="ff-header__button-icon">
          <ConservativeGitHubIcon />
        </span>
        <span className="ff-header__button-label">{buttonLabel}</span>
      </button>
    </div>
  );
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

interface ViewNavigationItem {
  readonly active: boolean;
  readonly disabled?: boolean;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick: () => void;
  readonly tooltip?: string;
}

function VisualNavIcon() {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3" cy="3" fill="currentColor" r="1.5" />
      <circle cx="15" cy="3" fill="currentColor" r="1.5" />
      <circle cx="9" cy="11" fill="currentColor" r="1.5" />
      <path d="M4.25 3H13.75M4.2 4.2L7.8 9.8M13.8 4.2L10.2 9.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function CodeNavIcon() {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2L2.5 7L6 12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2L15.5 7L12 12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 1.5L8 12.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function DeployNavIcon() {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1.5V9.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M5.8 6.6L9 9.8L12.2 6.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M3 12H15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function AuthorizeNavIcon() {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1.4L14.5 3.5V6.8C14.5 10 12.15 12.3 9 12.9C5.85 12.3 3.5 10 3.5 6.8V3.5L9 1.4Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 5.1V8.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <circle cx="9" cy="9.9" fill="currentColor" r="0.8" />
    </svg>
  );
}

function SimulateNavIcon() {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" fill="currentColor" r="1.1" />
      <path d="M5.4 7C5.4 5.01 7.01 3.4 9 3.4C10.99 3.4 12.6 5.01 12.6 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M2.5 7C2.5 3.41 5.41 0.5 9 0.5C12.59 0.5 15.5 3.41 15.5 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M9 7L14.3 2.9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function buildViewNavigationItems(input: {
  readonly activeView: PrimaryView;
  readonly canAccessDeploy: boolean;
  readonly canAccessMove: boolean;
  readonly canAuthorize: boolean;
  readonly isCompiling: boolean;
  readonly onViewChange: (view: PrimaryView) => void;
}): readonly ViewNavigationItem[] {
  const compileTooltip = input.isCompiling
    ? "Automatic compile is in progress"
    : "Automatic compile will unlock Code after the current graph settles";
  const deployTooltip = input.isCompiling
    ? "Automatic compile is in progress"
    : "Compile the current graph before reviewing deploy checks";

  return [
    {
      active: input.activeView === "visual",
      icon: <VisualNavIcon />,
      label: "Visual",
      onClick: () => { input.onViewChange("visual"); },
    },
    {
      active: input.activeView === "move",
      disabled: !input.canAccessMove,
      icon: <CodeNavIcon />,
      label: "Code",
      onClick: () => { input.onViewChange("move"); },
      tooltip: !input.canAccessMove ? compileTooltip : undefined,
    },
    {
      active: input.activeView === "deploy",
      disabled: !input.canAccessDeploy,
      icon: <DeployNavIcon />,
      label: "Deploy",
      onClick: () => { input.onViewChange("deploy"); },
      tooltip: !input.canAccessDeploy ? deployTooltip : undefined,
    },
    {
      active: input.activeView === "authorize",
      disabled: !input.canAuthorize,
      icon: <AuthorizeNavIcon />,
      label: "Authorize",
      onClick: () => { input.onViewChange("authorize"); },
      tooltip: !input.canAuthorize ? "Deploy a contract first" : undefined,
    },
    {
      active: input.activeView === "simulate",
      disabled: !input.canAuthorize,
      icon: <SimulateNavIcon />,
      label: "Simulate",
      onClick: () => { input.onViewChange("simulate"); },
      tooltip: !input.canAuthorize ? "Deploy a contract first" : undefined,
    },
  ];
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
  const items = buildViewNavigationItems({
    activeView,
    canAccessDeploy,
    canAccessMove,
    canAuthorize,
    isCompiling,
    onViewChange,
  });

  return (
    <nav aria-label="Primary" className="ff-header__nav">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          <NavigationButton {...item} />
          {index < items.length - 1 ? <WorkflowSeparator /> : null}
        </Fragment>
      ))}
    </nav>
  );
}

function HeaderActions({
  activeView,
  gitHubAccessState,
  hasGitHubAuth,
  onDetectedDeploymentTarget,
  onGitHubSignIn,
  onGitHubSignOut,
  onStartTutorial,
  selectedDeploymentTarget,
}: HeaderActionsProps) {
  return (
    <div className="ff-header__actions">
      {activeView === "visual" && onStartTutorial !== undefined ? (
        <button
          aria-label="Start tutorial"
          className="ff-header__help-button"
          onClick={onStartTutorial}
          title="Start tutorial"
          type="button"
        >
          ?
        </button>
      ) : null}
      <GitHubAuthControl accessState={gitHubAccessState} hasGitHubAuth={hasGitHubAuth} onGitHubSignIn={onGitHubSignIn} onGitHubSignOut={onGitHubSignOut} />
      <WalletStatus onDetectedDeploymentTarget={onDetectedDeploymentTarget} selectedDeploymentTarget={selectedDeploymentTarget} />
    </div>
  );
}

function Header({
  activeView = "visual",
  canAccessDeploy = false,
  canAccessMove = false,
  gitHubAccessState = {
    mode: "anonymous",
    indicatorVariant: "neutral",
    grantedScopes: [],
    verifiedAt: null,
    loginLabel: null,
    lastFailureKind: null,
  },
  hasGitHubAuth = false,
  hasAuthorizeAccess = false,
  isCompiling = false,
  onDetectedDeploymentTarget,
  onGitHubSignIn,
  onGitHubSignOut,
  onStartTutorial,
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
            <h1 className="ff-header__title truncate font-heading text-lg uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-xl">
              Frontier Flow
            </h1>
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

        <HeaderActions
          activeView={activeView}
          gitHubAccessState={gitHubAccessState}
          hasGitHubAuth={hasGitHubAuth}
          onDetectedDeploymentTarget={onDetectedDeploymentTarget}
          onGitHubSignIn={onGitHubSignIn}
          onGitHubSignOut={onGitHubSignOut}
          onStartTutorial={onStartTutorial}
          selectedDeploymentTarget={selectedDeploymentTarget}
        />
      </div>
    </header>
  );
}

export default Header;