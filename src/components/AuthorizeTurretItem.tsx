import type { TurretInfo } from "../types/authorization";
import { formatAddress } from "../utils/formatAddress";

interface AuthorizeTurretItemProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
  readonly showReplacementWarning?: boolean;
  readonly turret: TurretInfo;
}

function getItemClassName(checked: boolean, disabled: boolean): string {
  return [
    "ff-authorize-turret-item",
    checked ? "is-selected" : "",
    disabled ? "is-disabled" : "",
  ].filter(Boolean).join(" ");
}

function getBadgeClassName(turret: TurretInfo): string {
  return [
    "ff-authorize-turret-item__badge",
    turret.currentExtension?.isCurrentDeployment ? "ff-authorize-turret-item__badge--current" : "",
  ].filter(Boolean).join(" ");
}

function getBadgeLabel(turret: TurretInfo): string {
  if (turret.currentExtension === null) {
    return "No extension";
  }

  return turret.currentExtension.isCurrentDeployment ? "Current extension" : turret.currentExtension.moduleName;
}

/**
 * Render a single turret row with a sci-fi checkbox and extension badge.
 */
function AuthorizeTurretItem({ checked, disabled = false, onToggle, showReplacementWarning = false, turret }: AuthorizeTurretItemProps) {
  const title = turret.displayName ?? formatAddress(turret.objectId);

  return (
    <label className={getItemClassName(checked, disabled)}>
      <span className="ff-authorize-turret-item__checkbox-shell">
        <input
          aria-label={title}
          checked={checked}
          className="ff-authorize-turret-item__checkbox"
          disabled={disabled}
          onChange={onToggle}
          type="checkbox"
        />
        <span aria-hidden="true" className="ff-authorize-turret-item__checkbox-indicator" />
      </span>

      <span className="ff-authorize-turret-item__body">
        <span className="ff-authorize-turret-item__title-row">
          <span className="ff-authorize-turret-item__title">{title}</span>
          <span className={getBadgeClassName(turret)}>
            {getBadgeLabel(turret)}
          </span>
        </span>
        <span className="ff-authorize-turret-item__meta">{formatAddress(turret.objectId)}</span>
        {showReplacementWarning ? (
          <span className="ff-authorize-turret-item__warning">This will replace the current extension</span>
        ) : null}
      </span>
    </label>
  );
}

export default AuthorizeTurretItem;