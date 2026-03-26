import { useEffect, useId, useRef, useState } from "react";

import type { DeploymentTargetId } from "../compiler/types";
import { DEPLOYMENT_TARGETS, getDeploymentTarget } from "../data/deploymentTargets";
import LocalEnvironmentSettingsModal from "./LocalEnvironmentSettingsModal";

interface VisualDeploymentTargetSelectorProps {
  readonly onTargetChange: (target: DeploymentTargetId) => void;
  readonly selectedTarget: DeploymentTargetId;
}

interface TargetMenuProps {
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  readonly focusOption: (index: number) => void;
  readonly menuId: string;
  readonly onOpenLocalEnvironmentSettings: () => void;
  readonly onTargetChange: (target: DeploymentTargetId) => void;
  readonly optionRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  readonly selectedTarget: DeploymentTargetId;
  readonly setMenuOpen: (open: boolean) => void;
}

interface TargetSelectorTriggerProps {
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  readonly menuId: string;
  readonly menuOpen: boolean;
  readonly onCloseMenu: () => void;
  readonly onOpenMenu: (focusTarget?: "first" | "last" | "selected") => void;
  readonly selectedTarget: DeploymentTargetId;
}

function TargetMenu({ buttonRef, focusOption, menuId, onOpenLocalEnvironmentSettings, onTargetChange, optionRefs, selectedTarget, setMenuOpen }: TargetMenuProps) {
  return (
    <div
      aria-label="Target network/server"
      className="ff-visual-target-selector__menu"
      id={menuId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          buttonRef.current?.focus();
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
        <div className="ff-visual-target-selector__option-row" key={target.id}>
          <button
            aria-checked={target.id === selectedTarget}
            className="ff-visual-target-selector__option"
            onClick={() => {
              onTargetChange(target.id);
              setMenuOpen(false);
              buttonRef.current?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onTargetChange(target.id);
                setMenuOpen(false);
                buttonRef.current?.focus();
              }
            }}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            role="menuitemradio"
            type="button"
          >
            <span className="ff-visual-target-selector__option-label">{getDeploymentTarget(target.id).label}</span>
          </button>
          {target.id === "local" ? (
            <button
              aria-label="Configure local environment"
              className="ff-visual-target-selector__settings"
              onClick={() => {
                setMenuOpen(false);
                onOpenLocalEnvironmentSettings();
              }}
              type="button"
            >
              <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.55 2.2H9.45L9.83 3.72C10.18 3.84 10.5 4.01 10.8 4.2L12.24 3.54L13.7 6.06L12.5 7.04C12.54 7.34 12.54 7.66 12.5 7.96L13.7 8.94L12.24 11.46L10.8 10.8C10.5 10.99 10.18 11.16 9.83 11.28L9.45 12.8H6.55L6.17 11.28C5.82 11.16 5.5 10.99 5.2 10.8L3.76 11.46L2.3 8.94L3.5 7.96C3.46 7.66 3.46 7.34 3.5 7.04L2.3 6.06L3.76 3.54L5.2 4.2C5.5 4.01 5.82 3.84 6.17 3.72L6.55 2.2Z" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8" cy="7.5" r="1.9" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TargetSelectorTrigger({ buttonRef, menuId, menuOpen, onCloseMenu, onOpenMenu, selectedTarget }: TargetSelectorTriggerProps) {
  const selectedTargetLabel = getDeploymentTarget(selectedTarget).label;

  return (
    <div className="ff-visual-target-selector__field">
      <span aria-hidden="true" className="ff-visual-target-selector__icon-shell">
        <svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.25" />
          <path d="M9 2.75C10.6 4.4 11.5 6.63 11.5 9C11.5 11.37 10.6 13.6 9 15.25C7.4 13.6 6.5 11.37 6.5 9C6.5 6.63 7.4 4.4 9 2.75Z" stroke="currentColor" strokeWidth="1.25" />
          <path d="M3.2 6.75H14.8" stroke="currentColor" strokeWidth="1.25" />
          <path d="M3.2 11.25H14.8" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </span>
      <button
        aria-controls={menuId}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Target network/server"
        className="ff-visual-target-selector__trigger"
        onClick={() => {
          if (menuOpen) {
            onCloseMenu();
            return;
          }

          onOpenMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCloseMenu();
            return;
          }

          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenMenu(event.key === "ArrowDown" ? "first" : "selected");
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            onOpenMenu("last");
          }
        }}
        ref={buttonRef}
        type="button"
      >
        <span className="ff-visual-target-selector__value">{selectedTargetLabel}</span>
      </button>
      <span aria-hidden="true" className="ff-visual-target-selector__caret">▼</span>
    </div>
  );
}

/**
 * Fixed-width deployment target selector anchored inside the Visual workspace.
 */
function VisualDeploymentTargetSelector({ onTargetChange, selectedTarget }: VisualDeploymentTargetSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [localSettingsOpen, setLocalSettingsOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState<"first" | "last" | "selected">("selected");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const selectedIndex = DEPLOYMENT_TARGETS.findIndex((target) => target.id === selectedTarget);
    const fallbackIndex = selectedIndex === -1 ? 0 : selectedIndex;
    const focusIndex = initialFocus === "first"
      ? 0
      : initialFocus === "last"
        ? DEPLOYMENT_TARGETS.length - 1
        : fallbackIndex;

    optionRefs.current[focusIndex]?.focus();
  }, [initialFocus, menuOpen, selectedTarget]);

  const focusOption = (index: number) => {
    const optionCount = DEPLOYMENT_TARGETS.length;
    const normalizedIndex = (index + optionCount) % optionCount;
    optionRefs.current[normalizedIndex]?.focus();
  };

  const openMenu = (focusTarget: "first" | "last" | "selected" = "selected") => {
    setInitialFocus(focusTarget);
    setMenuOpen(true);
  };

  return (
    <div
      className={`ff-visual-target-selector${menuOpen ? " ff-visual-target-selector--active" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setMenuOpen(false);
        }
      }}
    >
      <TargetSelectorTrigger
        buttonRef={buttonRef}
        menuId={menuId}
        menuOpen={menuOpen}
        onCloseMenu={() => {
          setMenuOpen(false);
        }}
        onOpenMenu={openMenu}
        selectedTarget={selectedTarget}
      />
      {menuOpen ? (
        <TargetMenu
          buttonRef={buttonRef}
          focusOption={focusOption}
          menuId={menuId}
          onOpenLocalEnvironmentSettings={() => {
            setLocalSettingsOpen(true);
          }}
          onTargetChange={onTargetChange}
          optionRefs={optionRefs}
          selectedTarget={selectedTarget}
          setMenuOpen={setMenuOpen}
        />
      ) : null}
      {localSettingsOpen ? (
        <LocalEnvironmentSettingsModal
          isOpen={localSettingsOpen}
          onClose={() => {
            setLocalSettingsOpen(false);
            buttonRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

export default VisualDeploymentTargetSelector;