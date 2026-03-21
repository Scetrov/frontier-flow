import { useRef, useState } from "react";

import type { DeploymentTargetId } from "../compiler/types";
import { DEPLOYMENT_TARGETS } from "../data/deploymentTargets";
import { ConservativeDeployIcon } from "./HeaderActionIcons";

interface DeploymentTargetControlProps {
  readonly canDeploy?: boolean;
  readonly isDeploying?: boolean;
  readonly onDeploy?: () => void;
  readonly onTargetChange?: (target: DeploymentTargetId) => void;
  readonly selectedTarget: DeploymentTargetId;
}

/**
 * Header control for selecting a deployment target and launching deployment.
 */
function DeploymentTargetControl({
  canDeploy = false,
  isDeploying = false,
  onDeploy,
  onTargetChange,
  selectedTarget,
}: DeploymentTargetControlProps) {
  const [isActive, setIsActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const isDeployDisabled = isDeploying || onDeploy === undefined;

  return (
    <div
      className={`ff-deployment-target-control${isActive ? " ff-deployment-target-control--active" : ""}`}
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
        aria-label={isDeploying ? `Deploying ${selectedTarget}` : `Deploy ${selectedTarget}`}
        className="ff-header__button ff-header__button--compact ff-deployment-target-control__primary"
        disabled={isDeployDisabled}
        onClick={() => {
          onDeploy?.();
        }}
        title={canDeploy ? undefined : `Review blockers for ${selectedTarget} deployment`}
        type="button"
      >
        <span aria-hidden="true" className="ff-header__button-icon">
          <ConservativeDeployIcon />
        </span>
        <span className="ff-header__button-label">{isDeploying ? `Deploying ${selectedTarget}` : `Deploy ${selectedTarget}`}</span>
      </button>
      <button
        aria-controls="deployment-target-list"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Select deployment target"
        className="ff-header__button ff-header__button--compact ff-deployment-target-control__toggle"
        onClick={() => {
          setMenuOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
          }
        }}
        ref={toggleButtonRef}
        title="Select deployment target"
        type="button"
      >
        <span aria-hidden="true">▼</span>
      </button>

      {menuOpen ? (
        <div
          aria-label="Deployment targets"
          className="ff-deployment-target-control__menu"
          id="deployment-target-list"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              toggleButtonRef.current?.focus();
            }
          }}
          role="menu"
          tabIndex={-1}
        >
          {DEPLOYMENT_TARGETS.map((target) => (
            <button
              aria-checked={target.id === selectedTarget}
              className="ff-deployment-target-control__option"
              key={target.id}
              onClick={() => {
                onTargetChange?.(target.id);
                setMenuOpen(false);
                toggleButtonRef.current?.focus();
              }}
              role="menuitemradio"
              type="button"
            >
              {target.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default DeploymentTargetControl;