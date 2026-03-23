import type { TurretInfo } from "../types/authorization";
import { formatAddress } from "../utils/formatAddress";

interface AuthorizeTurretItemProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
  readonly turret: TurretInfo;
}

/**
 * Render a single turret row with a sci-fi checkbox and extension badge.
 */
function AuthorizeTurretItem({ checked, disabled = false, onToggle, turret }: AuthorizeTurretItemProps) {
  const title = turret.displayName ?? formatAddress(turret.objectId);
  const badgeLabel = turret.currentExtension === null
    ? "No extension"
    : turret.currentExtension.isCurrentDeployment
      ? "Current extension"
      : turret.currentExtension.moduleName;

  return (
    <label className={[
      "ff-authorize-turret-item",
      checked ? "is-selected" : "",
      disabled ? "is-disabled" : "",
    ].filter(Boolean).join(" ")}>
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
          <span className={[
            "ff-authorize-turret-item__badge",
            turret.currentExtension?.isCurrentDeployment ? "ff-authorize-turret-item__badge--current" : "",
          ].filter(Boolean).join(" ")}>
            {badgeLabel}
          </span>
        </span>
        <span className="ff-authorize-turret-item__meta">{formatAddress(turret.objectId)}</span>
      </span>
    </label>
  );
}

export default AuthorizeTurretItem;