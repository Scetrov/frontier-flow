import { useEffect, useId, useRef, useState } from "react";

import type { DeploymentTargetId } from "../compiler/types";
import { DEPLOYMENT_TARGETS } from "../data/deploymentTargets";
import { ConservativeDeployIcon } from "./HeaderActionIcons";

interface DeploymentTargetControlProps {
  readonly canDeploy?: boolean;
  readonly isDeploying?: boolean;
  readonly isUpgrade?: boolean;
  readonly onDeploy?: () => void;
  readonly onTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedTarget: DeploymentTargetId;
}

interface DeploymentTargetMenuProps {
  readonly descriptionId: string;
  readonly initialFocus: "first" | "last" | "selected";
  readonly onTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedTarget: DeploymentTargetId;
  readonly setMenuOpen: (open: boolean) => void;
  readonly toggleButtonRef: React.RefObject<HTMLButtonElement | null>;
}

function DeploymentTargetMenu({
  descriptionId,
  initialFocus,
  onTargetChange,
  selectedTarget,
  setMenuOpen,
  toggleButtonRef,
}: DeploymentTargetMenuProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const selectedIndex = DEPLOYMENT_TARGETS.findIndex((target) => target.id === selectedTarget);
    const fallbackIndex = selectedIndex === -1 ? 0 : selectedIndex;
    const focusIndex = initialFocus === "first"
      ? 0
      : initialFocus === "last"
        ? DEPLOYMENT_TARGETS.length - 1
        : fallbackIndex;

    optionRefs.current[focusIndex]?.focus();
  }, [initialFocus, selectedTarget]);

  const focusOption = (index: number) => {
    const optionCount = DEPLOYMENT_TARGETS.length;
    const normalizedIndex = (index + optionCount) % optionCount;
    optionRefs.current[normalizedIndex]?.focus();
  };

  return (
    <div
      aria-describedby={descriptionId}
      aria-label="Deployment targets"
      className="ff-deployment-target-control__menu"
      id="deployment-target-list"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          toggleButtonRef.current?.focus();
          return;
        }

        const focusedIndex = optionRefs.current.findIndex((option) => option === document.activeElement);

        if (event.key === "ArrowDown") {
          event.preventDefault();
          focusOption(focusedIndex === -1 ? 0 : focusedIndex + 1);
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          focusOption(focusedIndex === -1 ? DEPLOYMENT_TARGETS.length - 1 : focusedIndex - 1);
          return;
        }

        if (event.key === "Home") {
          event.preventDefault();
          focusOption(0);
          return;
        }

        if (event.key === "End") {
          event.preventDefault();
          focusOption(DEPLOYMENT_TARGETS.length - 1);
        }
      }}
      role="menu"
      tabIndex={-1}
    >
      {DEPLOYMENT_TARGETS.map((target, index) => (
        <button
          aria-checked={target.id === selectedTarget}
          className="ff-deployment-target-control__option"
          key={target.id}
          onClick={() => {
            onTargetChange?.(target.id);
            setMenuOpen(false);
            toggleButtonRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onTargetChange?.(target.id);
              setMenuOpen(false);
              toggleButtonRef.current?.focus();
            }
          }}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          role="menuitemradio"
          type="button"
        >
          {target.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Header control for selecting a deployment target and launching deployment.
 */
function DeploymentTargetControl({
  canDeploy = false,
  isDeploying = false,
  isUpgrade = false,
  onDeploy,
  onTargetChange,
  selectedTarget,
}: DeploymentTargetControlProps) {
  const [isActive, setIsActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuInitialFocus, setMenuInitialFocus] = useState<"first" | "last" | "selected">("selected");
  const statusDescriptionId = useId();
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const isDeployDisabled = isDeploying || onDeploy === undefined;
  const actionVerb = isUpgrade ? "Upgrade" : "Deploy";
  const inProgressVerb = isUpgrade ? "Upgrading" : "Deploying";
  const deployLabel = isDeploying ? `${inProgressVerb} ${selectedTarget}` : `${actionVerb} ${selectedTarget}`;
  const containerClassName = `ff-deployment-target-control${isActive ? " ff-deployment-target-control--active" : ""}`;
  const deployTitle = canDeploy
    ? undefined
    : `Review blockers for ${selectedTarget} ${isUpgrade ? "upgrade" : "deployment"}`;
  const deployDescription = isDeploying
    ? `${inProgressVerb} for ${selectedTarget} is currently in progress.`
    : canDeploy
      ? `Launch ${actionVerb.toLowerCase()} for ${selectedTarget}.`
      : `Review blockers for ${selectedTarget} ${isUpgrade ? "upgrade" : "deployment"} before retrying.`;

  const openMenu = (initialFocus: "first" | "last" | "selected" = "selected") => {
    setMenuInitialFocus(initialFocus);
    setMenuOpen(true);
  };

  return (
    <div
      className={containerClassName}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsActive(false);
          setMenuOpen(false);
        }
      }}
      onFocus={() => {
        setIsActive(true);
      }}
      onMouseEnter={() => {
        setIsActive(true);
      }}
      onMouseLeave={() => {
        setIsActive(false);
      }}
    >
      <button
        aria-describedby={statusDescriptionId}
        aria-label={deployLabel}
        className="ff-header__button ff-header__button--compact ff-deployment-target-control__primary"
        disabled={isDeployDisabled}
        onClick={() => {
          onDeploy?.();
        }}
        title={deployTitle}
        type="button"
      >
        <span aria-hidden="true" className="ff-header__button-icon">
          <ConservativeDeployIcon />
        </span>
        <span className="ff-header__button-label">{deployLabel}</span>
      </button>
      <span className="ff-assistive-text" id={statusDescriptionId}>{deployDescription}</span>
      <button
        aria-controls="deployment-target-list"
        aria-describedby={statusDescriptionId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Select deployment target"
        className="ff-header__button ff-header__button--compact ff-deployment-target-control__toggle"
        onClick={() => {
          if (menuOpen) {
            setMenuOpen(false);
            return;
          }

          openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setMenuOpen(false);
            return;
          }

          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu(event.key === "ArrowDown" ? "first" : "selected");
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu("last");
          }
        }}
        ref={toggleButtonRef}
        title="Select deployment target"
        type="button"
      >
        <span aria-hidden="true">▼</span>
      </button>

      {menuOpen ? (
        <DeploymentTargetMenu
          descriptionId={statusDescriptionId}
          initialFocus={menuInitialFocus}
          onTargetChange={onTargetChange}
          selectedTarget={selectedTarget}
          setMenuOpen={setMenuOpen}
          toggleButtonRef={toggleButtonRef}
        />
      ) : null}
    </div>
  );
}

export default DeploymentTargetControl;