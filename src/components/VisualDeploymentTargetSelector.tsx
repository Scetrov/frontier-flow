import { useEffect, useId, useRef, useState } from "react";

import type { DeploymentTargetId } from "../compiler/types";
import { DEPLOYMENT_TARGETS } from "../data/deploymentTargets";

interface VisualDeploymentTargetSelectorProps {
  readonly onTargetChange: (target: DeploymentTargetId) => void;
  readonly selectedTarget: DeploymentTargetId;
}

/**
 * Fixed-width deployment target selector anchored inside the Visual workspace.
 */
function VisualDeploymentTargetSelector({ onTargetChange, selectedTarget }: VisualDeploymentTargetSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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
          ref={buttonRef}
          type="button"
        >
          <span className="ff-visual-target-selector__value">{selectedTarget}</span>
        </button>
        <span aria-hidden="true" className="ff-visual-target-selector__caret">▼</span>
      </div>
      {menuOpen ? (
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
            <button
              aria-checked={target.id === selectedTarget}
              className="ff-visual-target-selector__option"
              key={target.id}
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
              <span className="ff-visual-target-selector__option-label">{target.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default VisualDeploymentTargetSelector;