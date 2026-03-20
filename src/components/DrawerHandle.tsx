import { ChevronLeft, ChevronRight } from "lucide-react";

interface DrawerHandleProps {
  readonly controls: string;
  readonly expanded: boolean;
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly drawerLabel: string;
  readonly side: "left" | "right";
  readonly onClick: () => void;
}

function DrawerHandle({ controls, expanded, openLabel, closeLabel, drawerLabel, side, onClick }: DrawerHandleProps) {
  const isLeft = side === "left";
  const buttonLabel = expanded ? closeLabel : openLabel;
  const Icon = expanded
    ? isLeft ? ChevronLeft : ChevronRight
    : isLeft ? ChevronRight : ChevronLeft;

  return (
    <button
      aria-controls={controls}
      aria-expanded={expanded}
      aria-label={buttonLabel}
      className={`ff-canvas__drawer-handle ff-canvas__drawer-handle--${side}`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="ff-canvas__drawer-handle-icon-shell">
        <Icon className="ff-canvas__drawer-handle-icon" />
      </span>
      <span aria-hidden="true" className="ff-canvas__drawer-handle-label">
        {drawerLabel}
      </span>
    </button>
  );
}

export default DrawerHandle;