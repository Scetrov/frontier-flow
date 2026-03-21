import { useState } from "react";

import type { DeploymentTargetId } from "../compiler/types";
import { DEPLOYMENT_TARGETS } from "../data/deploymentTargets";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const isDeployDisabled = isDeploying || onDeploy === undefined;

  return (
    <div className="ff-deployment-target-control">
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
          <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2L13 8L8 7L7 14L3 8L7 7L8 2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </span>
        <span className="ff-header__button-label">{isDeploying ? `Deploying ${selectedTarget}` : `Deploy ${selectedTarget}`}</span>
      </button>
      <button
        aria-controls="deployment-target-list"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label="Select deployment target"
        className="ff-header__button ff-header__button--compact ff-deployment-target-control__toggle"
        onClick={() => {
          setMenuOpen((current) => !current);
        }}
        title="Select deployment target"
        type="button"
      >
        <span aria-hidden="true">▼</span>
      </button>

      {menuOpen ? (
        <div aria-label="Deployment targets" className="ff-deployment-target-control__menu" id="deployment-target-list" role="listbox">
          {DEPLOYMENT_TARGETS.map((target) => (
            <button
              aria-selected={target.id === selectedTarget}
              className="ff-deployment-target-control__option"
              key={target.id}
              onClick={() => {
                onTargetChange?.(target.id);
                setMenuOpen(false);
              }}
              role="option"
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