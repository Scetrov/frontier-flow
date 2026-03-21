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
        className="ff-header__button ff-deployment-target-control__primary"
        disabled={isDeployDisabled}
        onClick={() => {
          onDeploy?.();
        }}
        title={canDeploy ? undefined : `Review blockers for ${selectedTarget} deployment`}
        type="button"
      >
        {isDeploying ? `Deploying ${selectedTarget}` : `Deploy ${selectedTarget}`}
      </button>
      <button
        aria-controls="deployment-target-list"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        className="ff-header__button ff-deployment-target-control__toggle"
        onClick={() => {
          setMenuOpen((current) => !current);
        }}
        type="button"
      >
        Select deployment target
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