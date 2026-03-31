import type { TurretInfo } from "../types/authorization";

interface AuthorizeTurretItemProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onSimulate?: (turret: TurretInfo) => void;
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
function AuthorizeTurretItem({ checked, disabled = false, onSimulate, onToggle, showReplacementWarning = false, turret }: AuthorizeTurretItemProps) {
  const title = turret.displayName ?? turret.objectId;

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
          <span className="flex items-center gap-2">
            <span className={getBadgeClassName(turret)}>
              {getBadgeLabel(turret)}
            </span>
            <button
              aria-label={`Simulate turret ${title}`}
              className="ff-authorize-view__action h-auto min-h-0 px-3 py-2 font-heading text-[0.62rem] uppercase tracking-[0.16em]"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSimulate?.(turret);
              }}
              type="button"
            >
              Simulate
            </button>
          </span>
        </span>
        <span className="ff-authorize-turret-item__meta">{turret.objectId}</span>
        {showReplacementWarning ? (
          <span className="ff-authorize-turret-item__warning">This will replace the current extension</span>
        ) : null}
      </span>
    </label>
  );
}

export default AuthorizeTurretItem;