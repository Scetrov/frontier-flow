import { useEffect, useMemo, useRef, useState } from "react";

import type { TutorialStepDefinition } from "../types/tutorial";

export interface TutorialOverlayProps {
  /** Whether the overlay is visible. */
  readonly isActive: boolean;
  /** Current step definition. */
  readonly currentStep: TutorialStepDefinition | null;
  /** Zero-based index of the current step. */
  readonly currentStepIndex: number;
  /** Total number of steps. */
  readonly totalSteps: number;
  /** Bounding rect used to position the spotlight. */
  readonly targetRect: DOMRect | null;
  /** Advance callback. */
  readonly onNext: () => void;
  /** Dismiss callback. */
  readonly onDismiss: () => void;
}

const TOOLTIP_GAP_PX = 12;
const VIEWPORT_PADDING_PX = 8;
const TOOLTIP_WIDTH_PX = 320;
const TOOLTIP_HEIGHT_PX = 212;
const SPOTLIGHT_PADDING_PX = 8;
const TOOLTIP_TRANSITION_MS = 200;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getFocusableElements(panel: HTMLElement | null): HTMLElement[] {
  if (panel === null) {
    return [];
  }

  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function trapFocusWithinPanel(event: KeyboardEvent, panel: HTMLElement | null): void {
  const focusableElements = getFocusableElements(panel);

  if (focusableElements.length === 0) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (activeElement === panel) {
    event.preventDefault();
    (event.shiftKey ? lastElement : firstElement).focus();
    return;
  }

  const activeIndex = focusableElements.findIndex((element) => element === activeElement);
  if (activeIndex !== -1) {
    event.preventDefault();
    const nextIndex = (activeIndex + (event.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function getTooltipCoordinates(targetRect: DOMRect, preferredPosition: TutorialStepDefinition["tooltipPosition"]) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;

  const centeredLeft = clamp(
    targetRect.left + (targetRect.width / 2) - (TOOLTIP_WIDTH_PX / 2),
    VIEWPORT_PADDING_PX,
    viewportWidth - TOOLTIP_WIDTH_PX - VIEWPORT_PADDING_PX,
  );
  const centeredTop = clamp(
    targetRect.top + (targetRect.height / 2) - (TOOLTIP_HEIGHT_PX / 2),
    VIEWPORT_PADDING_PX,
    viewportHeight - TOOLTIP_HEIGHT_PX - VIEWPORT_PADDING_PX,
  );

  const candidatePositions = {
    bottom: {
      top: targetRect.bottom + TOOLTIP_GAP_PX,
      left: centeredLeft,
    },
    left: {
      top: centeredTop,
      left: targetRect.left - TOOLTIP_WIDTH_PX - TOOLTIP_GAP_PX,
    },
    right: {
      top: centeredTop,
      left: targetRect.right + TOOLTIP_GAP_PX,
    },
    top: {
      top: targetRect.top - TOOLTIP_HEIGHT_PX - TOOLTIP_GAP_PX,
      left: centeredLeft,
    },
  } as const;

  const fallbackOrder: readonly TutorialStepDefinition["tooltipPosition"][] = [
    preferredPosition,
    preferredPosition === "left" ? "right" : preferredPosition === "right" ? "left" : "bottom",
    preferredPosition === "top" ? "bottom" : "top",
    "bottom",
  ];

  for (const position of fallbackOrder) {
    const candidate = candidatePositions[position];
    const fitsHorizontally = candidate.left >= VIEWPORT_PADDING_PX
      && candidate.left + TOOLTIP_WIDTH_PX <= viewportWidth - VIEWPORT_PADDING_PX;
    const fitsVertically = candidate.top >= VIEWPORT_PADDING_PX
      && candidate.top + TOOLTIP_HEIGHT_PX <= viewportHeight - VIEWPORT_PADDING_PX;

    if (fitsHorizontally && fitsVertically) {
      return candidate;
    }
  }

  return {
    top: clamp(centeredTop, VIEWPORT_PADDING_PX, viewportHeight - TOOLTIP_HEIGHT_PX - VIEWPORT_PADDING_PX),
    left: clamp(centeredLeft, VIEWPORT_PADDING_PX, viewportWidth - TOOLTIP_WIDTH_PX - VIEWPORT_PADDING_PX),
  };
}

function TutorialProgressDots({ currentStepIndex, totalSteps }: { readonly currentStepIndex: number; readonly totalSteps: number }) {
  return (
    <div aria-hidden="true" className="ff-tutorial__progress-dots">
      {Array.from({ length: totalSteps }, (_, index) => (
        <span
          className={`ff-tutorial__progress-dot${index === currentStepIndex ? " ff-tutorial__progress-dot--active" : ""}`}
          key={`tutorial-step-dot-${String(index + 1)}`}
        />
      ))}
    </div>
  );
}

interface ActiveTutorialOverlayProps {
  readonly currentStep: TutorialStepDefinition;
  readonly currentStepIndex: number;
  readonly onDismiss: () => void;
  readonly onNext: () => void;
  readonly targetRect: DOMRect;
  readonly totalSteps: number;
}

function ActiveTutorialOverlay({ currentStep, currentStepIndex, onDismiss, onNext, targetRect, totalSteps }: ActiveTutorialOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [visibleStepId, setVisibleStepId] = useState<TutorialStepDefinition["id"] | null>(null);
  const stepAnnouncement = `Step ${String(currentStepIndex + 1)} of ${String(totalSteps)}. ${currentStep.message}`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setVisibleStepId(currentStep.id);
      panelRef.current?.focus();
    }, TOOLTIP_TRANSITION_MS / 2);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentStep.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key === "Tab") {
        trapFocusWithinPanel(event, panelRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const tooltipStyle = useMemo(() => {
    const coordinates = getTooltipCoordinates(targetRect, currentStep.tooltipPosition);

    return {
      top: `${String(coordinates.top)}px`,
      left: `${String(coordinates.left)}px`,
      width: `min(${String(TOOLTIP_WIDTH_PX)}px, calc(100vw - ${String(VIEWPORT_PADDING_PX * 2)}px))`,
    };
  }, [currentStep, targetRect]);

  const isTooltipVisible = visibleStepId === currentStep.id;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const spotlightStyle = {
    top: `${String(targetRect.top - SPOTLIGHT_PADDING_PX)}px`,
    left: `${String(targetRect.left - SPOTLIGHT_PADDING_PX)}px`,
    width: `${String(targetRect.width + (SPOTLIGHT_PADDING_PX * 2))}px`,
    height: `${String(targetRect.height + (SPOTLIGHT_PADDING_PX * 2))}px`,
  };

  return (
    <div className="ff-tutorial" data-testid="tutorial-overlay-root">
      <div className="ff-tutorial__backdrop" />
      <div className="ff-tutorial__spotlight" style={spotlightStyle} />
      <div
        aria-labelledby="ff-tutorial-title"
        aria-modal="true"
        className={`ff-tutorial__panel${isTooltipVisible ? " ff-tutorial__panel--visible" : ""}`}
        ref={panelRef}
        role="dialog"
        style={tooltipStyle}
        tabIndex={-1}
      >
        <p className="ff-tutorial__eyebrow">Visual Designer tutorial</p>
        <h2 className="ff-tutorial__title" id="ff-tutorial-title">Step {String(currentStepIndex + 1)} of {String(totalSteps)}</h2>
        <p className="ff-tutorial__message">{currentStep.message}</p>
        <TutorialProgressDots currentStepIndex={currentStepIndex} totalSteps={totalSteps} />
        <div className="ff-tutorial__actions">
          <button className="ff-tutorial__button ff-tutorial__button--primary" onClick={onNext} type="button">
            {isLastStep ? "Finish" : "Next"}
          </button>
          <button className="ff-tutorial__button" onClick={onDismiss} type="button">
            Dismiss
          </button>
        </div>
        <div className="sr-only" aria-live="polite">{stepAnnouncement}</div>
      </div>
    </div>
  );
}

function TutorialOverlay({ currentStep, currentStepIndex, isActive, onDismiss, onNext, targetRect, totalSteps }: TutorialOverlayProps) {
  if (!isActive || currentStep === null || targetRect === null) {
    return null;
  }

  return (
    <ActiveTutorialOverlay
      currentStep={currentStep}
      currentStepIndex={currentStepIndex}
      onDismiss={onDismiss}
      onNext={onNext}
      targetRect={targetRect}
      totalSteps={totalSteps}
    />
  );
}

export default TutorialOverlay;