import { useEffect, useMemo, useState } from "react";

import type { TurretInfo } from "../types/authorization";
import AuthorizeTurretItem from "./AuthorizeTurretItem";

interface AuthorizeTurretListProps {
  readonly onSimulate?: (turret: TurretInfo) => void;
  readonly onSelectionChange?: (selectedTurretIds: readonly string[]) => void;
  readonly turrets: readonly TurretInfo[];
}

/**
 * Render the selectable turret roster and keep the actionable selection in sync.
 */
function AuthorizeTurretList({ onSelectionChange, onSimulate, turrets }: AuthorizeTurretListProps) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const selectableTurretIds = useMemo(
    () => turrets.filter((turret) => !turret.currentExtension?.isCurrentDeployment).map((turret) => turret.objectId),
    [turrets],
  );
  const selectAllDisabled = selectableTurretIds.length === 0;
  const selectableTurretIdSet = useMemo(() => new Set(selectableTurretIds), [selectableTurretIds]);
  const actionableSelectedIds = useMemo(
    () => selectedIds.filter((objectId) => selectableTurretIdSet.has(objectId)),
    [selectableTurretIdSet, selectedIds],
  );
  const actionableSelectedIdSet = useMemo(() => new Set(actionableSelectedIds), [actionableSelectedIds]);
  const allSelectableChecked = selectableTurretIds.length > 0 && selectableTurretIds.every((objectId) => actionableSelectedIdSet.has(objectId));

  useEffect(() => {
    onSelectionChange?.(actionableSelectedIds);
  }, [actionableSelectedIds, onSelectionChange]);

  return (
    <section aria-label="Owned turrets" className="ff-authorize-list">
      <div className="ff-authorize-list__header">
        <div>
          <p className="ff-authorize-list__eyebrow">Owned Turrets</p>
          <h2 className="ff-authorize-list__title">Select turrets to authorize</h2>
        </div>
        <label className={["ff-authorize-list__select-all", selectAllDisabled ? "is-disabled" : ""].filter(Boolean).join(" ")}>
          <span className="ff-authorize-list__select-all-shell">
            <input
              checked={allSelectableChecked}
              className="ff-authorize-list__select-all-input"
              disabled={selectAllDisabled}
              onChange={() => {
                setSelectedIds(allSelectableChecked ? [] : selectableTurretIds);
              }}
              type="checkbox"
            />
            <span aria-hidden="true" className="ff-authorize-list__select-all-indicator" />
          </span>
          <span className="ff-authorize-list__select-all-label">Select all available</span>
        </label>
      </div>

      <div className="ff-authorize-list__items">
        {turrets.map((turret) => {
          const disabled = turret.currentExtension?.isCurrentDeployment ?? false;
          const checked = disabled || actionableSelectedIdSet.has(turret.objectId);

          return (
            <AuthorizeTurretItem
              checked={checked}
              disabled={disabled}
              key={turret.objectId}
              onSimulate={onSimulate}
              onToggle={() => {
                if (disabled) {
                  return;
                }

                setSelectedIds((currentSelectedIds) => currentSelectedIds.includes(turret.objectId)
                  ? currentSelectedIds.filter((objectId) => objectId !== turret.objectId)
                  : [...currentSelectedIds, turret.objectId]);
              }}
              showReplacementWarning={checked && turret.currentExtension !== null && !disabled}
              turret={turret}
            />
          );
        })}
      </div>
    </section>
  );
}

export default AuthorizeTurretList;