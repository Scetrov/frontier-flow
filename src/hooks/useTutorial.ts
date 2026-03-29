import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PrimaryView } from "../components/Header";
import type { TutorialPersistedState, TutorialState } from "../types/tutorial";
import type { TutorialDrawerId } from "../types/tutorial";
import { TUTORIAL_STEPS } from "../utils/tutorialSteps";
import { loadUiState } from "../utils/uiStateStorage";

const TUTORIAL_STORAGE_KEY = "frontier-flow:tutorial";
const STORAGE_VERSION = 1;
const RETRY_DELAY_MS = 100;
const MAX_RETRIES = 3;
const AUTO_START_DELAY_MS = 500;

export interface UseTutorialOptions {
  /** Whether the Visual Designer canvas has rendered and can be targeted. */
  readonly isCanvasReady: boolean;
  /** Callback used to show or hide drawers that tutorial steps depend on. */
  readonly onSetDrawerVisibility: (drawer: TutorialDrawerId, open: boolean) => void;
  /** Callback used to insert a temporary demo node for the socket step. */
  readonly onInsertDemoNode: () => void;
  /** Callback used to remove the temporary demo node after the socket step ends. */
  readonly onRemoveDemoNode: () => void;
  /** Current primary view. */
  readonly activeView: PrimaryView;
}

export interface UseTutorialReturn {
  /** Whether the tutorial overlay is currently displayed. */
  readonly isActive: boolean;
  /** Current step definition, or null when inactive. */
  readonly currentStep: (typeof TUTORIAL_STEPS)[number] | null;
  /** Current step index, or -1 when inactive. */
  readonly currentStepIndex: number;
  /** Total number of tutorial steps. */
  readonly totalSteps: number;
  /** Bounding rect of the current target, or null while measuring. */
  readonly targetRect: DOMRect | null;
  /** Advances to the next tutorial step. */
  readonly next: () => void;
  /** Dismisses the tutorial. */
  readonly dismiss: () => void;
  /** Starts or restarts the tutorial from the beginning. */
  readonly start: () => void;
}

type TutorialDrawerVisibility = Record<TutorialDrawerId, boolean>;

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function createDefaultPersistedState(): TutorialPersistedState {
  return {
    version: STORAGE_VERSION,
    hasSeenTutorial: false,
  };
}

function loadPersistedState(storage: Storage | undefined): TutorialPersistedState {
  const rawValue = storage?.getItem(TUTORIAL_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return createDefaultPersistedState();
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (
      typeof parsedValue === "object"
      && parsedValue !== null
      && "version" in parsedValue
      && "hasSeenTutorial" in parsedValue
      && parsedValue.version === STORAGE_VERSION
      && typeof parsedValue.hasSeenTutorial === "boolean"
    ) {
      return parsedValue as TutorialPersistedState;
    }
  } catch {
    return createDefaultPersistedState();
  }

  return createDefaultPersistedState();
}

function savePersistedState(storage: Storage | undefined, state: TutorialPersistedState): void {
  storage?.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
}

function getPersistedDrawerVisibility(storage: Storage | undefined): TutorialDrawerVisibility {
  const uiState = loadUiState(storage);

  return {
    sidebar: uiState.isSidebarOpen,
    "contract-panel": uiState.isContractPanelOpen,
  };
}

function restoreDrawerVisibility(
  drawerVisibility: TutorialDrawerVisibility,
  onSetDrawerVisibility: UseTutorialOptions["onSetDrawerVisibility"],
): void {
  onSetDrawerVisibility("sidebar", drawerVisibility.sidebar);
  onSetDrawerVisibility("contract-panel", drawerVisibility["contract-panel"]);
}

function syncDrawerVisibilityForStep(
  currentStep: (typeof TUTORIAL_STEPS)[number],
  drawerVisibility: TutorialDrawerVisibility,
  onSetDrawerVisibility: UseTutorialOptions["onSetDrawerVisibility"],
): void {
  if (currentStep.id === "socket") {
    onSetDrawerVisibility("sidebar", false);
    onSetDrawerVisibility("contract-panel", false);
    return;
  }

  restoreDrawerVisibility(drawerVisibility, onSetDrawerVisibility);

  if (currentStep.requiresDrawerOpen !== null) {
    onSetDrawerVisibility(currentStep.requiresDrawerOpen, true);
  }
}

function debounce(callback: () => void, delayMs: number): () => void {
  let timeoutId: number | null = null;

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      callback();
    }, delayMs);
  };
}

function removeTutorialTargetClass(targetRef: { current: HTMLElement | null }): void {
  targetRef.current?.classList.remove("ff-tutorial__target");
  targetRef.current = null;
}

function applyTutorialTargetClass(targetRef: { current: HTMLElement | null }, element: HTMLElement): void {
  if (targetRef.current === element) {
    return;
  }

  removeTutorialTargetClass(targetRef);
  element.classList.add("ff-tutorial__target");
  targetRef.current = element;
}

export function useTutorial({ activeView, isCanvasReady, onInsertDemoNode, onRemoveDemoNode, onSetDrawerVisibility }: UseTutorialOptions): UseTutorialReturn {
  const [state, setState] = useState<TutorialState>({ status: "inactive", currentStepIndex: -1, targetRect: null });
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => loadPersistedState(getBrowserStorage()).hasSeenTutorial);
  const skipStepRef = useRef<() => void>(() => undefined);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const drawerVisibilityRef = useRef<TutorialDrawerVisibility | null>(null);
  const currentStep = state.status === "active" ? (TUTORIAL_STEPS[state.currentStepIndex] ?? null) : null;

  const persistSeenState = useCallback(() => {
    const nextState: TutorialPersistedState = {
      version: STORAGE_VERSION,
      hasSeenTutorial: true,
    };

    savePersistedState(getBrowserStorage(), nextState);
    setHasSeenTutorial(true);
  }, []);

  const dismiss = useCallback(() => {
    if (currentStep?.requiresDemoNode) {
      onRemoveDemoNode();
    }

    if (drawerVisibilityRef.current !== null) {
      restoreDrawerVisibility(drawerVisibilityRef.current, onSetDrawerVisibility);
      drawerVisibilityRef.current = null;
    }

    persistSeenState();
    removeTutorialTargetClass(activeTargetRef);
    setState({ status: "inactive", currentStepIndex: -1, targetRect: null });
  }, [currentStep?.requiresDemoNode, onRemoveDemoNode, onSetDrawerVisibility, persistSeenState]);

  const next = useCallback(() => {
    setState((currentState) => {
      if (currentState.status !== "active") {
        return currentState;
      }

      const activeStep = TUTORIAL_STEPS[currentState.currentStepIndex];
      if (activeStep.requiresDemoNode) {
        onRemoveDemoNode();
      }

      if (currentState.currentStepIndex >= TUTORIAL_STEPS.length - 1) {
        if (drawerVisibilityRef.current !== null) {
          restoreDrawerVisibility(drawerVisibilityRef.current, onSetDrawerVisibility);
          drawerVisibilityRef.current = null;
        }

        persistSeenState();
        removeTutorialTargetClass(activeTargetRef);
        return { status: "inactive", currentStepIndex: -1, targetRect: null };
      }

      removeTutorialTargetClass(activeTargetRef);
      return { status: "active", currentStepIndex: currentState.currentStepIndex + 1, targetRect: null };
    });
  }, [onRemoveDemoNode, onSetDrawerVisibility, persistSeenState]);

  const start = useCallback(() => {
    drawerVisibilityRef.current = getPersistedDrawerVisibility(getBrowserStorage());
    persistSeenState();
    removeTutorialTargetClass(activeTargetRef);
    setState({ status: "active", currentStepIndex: 0, targetRect: null });
  }, [persistSeenState]);

  useEffect(() => {
    skipStepRef.current = next;
  }, [next]);

  useEffect(() => {
    if (state.status !== "active" || currentStep === null) {
      removeTutorialTargetClass(activeTargetRef);
      return;
    }

    if (drawerVisibilityRef.current === null) {
      drawerVisibilityRef.current = getPersistedDrawerVisibility(getBrowserStorage());
    }

    syncDrawerVisibilityForStep(currentStep, drawerVisibilityRef.current, onSetDrawerVisibility);

    if (currentStep.requiresDemoNode) {
      onInsertDemoNode();
    }

    let cancelled = false;
    const timeoutIds: number[] = [];

    const measureTarget = (attempt: number) => {
      if (cancelled) {
        return;
      }

      const element = currentStep.resolveTarget();
      if (element !== null) {
        applyTutorialTargetClass(activeTargetRef, element);
        setState((currentState) => currentState.status === "active"
          ? { ...currentState, targetRect: element.getBoundingClientRect() }
          : currentState);
        return;
      }

      if (attempt >= MAX_RETRIES - 1) {
        timeoutIds.push(window.setTimeout(() => {
          if (!cancelled) {
            skipStepRef.current();
          }
        }, RETRY_DELAY_MS));
        return;
      }

      timeoutIds.push(window.setTimeout(() => {
        measureTarget(attempt + 1);
      }, RETRY_DELAY_MS));
    };

    measureTarget(0);

    return () => {
      cancelled = true;
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [currentStep, onInsertDemoNode, onSetDrawerVisibility, state.status]);

  useEffect(() => {
    if (state.status !== "active") {
      return;
    }

    const recalculateTargetRect = debounce(() => {
      const element = activeTargetRef.current;
      if (element === null) {
        return;
      }

      setState((currentState) => currentState.status === "active"
        ? { ...currentState, targetRect: element.getBoundingClientRect() }
        : currentState);
    }, RETRY_DELAY_MS);

    const handleViewportChange = () => {
      recalculateTargetRect();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "active" || activeView === "visual") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dismiss();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeView, dismiss, state.status]);

  useEffect(() => {
    if (hasSeenTutorial || !isCanvasReady || activeView !== "visual" || state.status === "active") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      start();
    }, AUTO_START_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeView, hasSeenTutorial, isCanvasReady, start, state.status]);

  useEffect(() => () => {
    removeTutorialTargetClass(activeTargetRef);
    if (drawerVisibilityRef.current !== null) {
      restoreDrawerVisibility(drawerVisibilityRef.current, onSetDrawerVisibility);
      drawerVisibilityRef.current = null;
    }
  }, [onSetDrawerVisibility]);

  return useMemo(() => ({
    isActive: state.status === "active",
    currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    targetRect: state.targetRect,
    next,
    dismiss,
    start,
  }), [currentStep, dismiss, next, start, state.currentStepIndex, state.status, state.targetRect]);
}