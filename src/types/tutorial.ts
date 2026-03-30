/**
 * Stable identifiers for the guided Visual Designer tutorial steps.
 */
export type TutorialStepId =
  | "network-selector"
  | "toolbox"
  | "socket"
  | "save-load"
  | "view-navigation"
  | "wallet-connect";

/**
 * Drawers that can be programmatically opened before measuring a tutorial target.
 */
export type TutorialDrawerId = "sidebar" | "contract-panel";

/**
 * Tooltip placement preference for a tutorial step.
 */
export type TutorialTooltipPosition = "top" | "bottom" | "left" | "right";

/**
 * Declarative configuration for a single tutorial step.
 */
export interface TutorialStepDefinition {
  readonly id: TutorialStepId;
  readonly ordinal: number;
  readonly message: string;
  readonly tooltipPosition: TutorialTooltipPosition;
  readonly resolveTarget: () => HTMLElement | null;
  readonly requiresDrawerOpen: TutorialDrawerId | null;
  readonly requiresDemoNode: boolean;
}

/**
 * In-memory tutorial state.
 */
export type TutorialState =
  | {
      readonly status: "inactive";
      readonly currentStepIndex: -1;
      readonly targetRect: null;
    }
  | {
      readonly status: "active";
      readonly currentStepIndex: number;
      readonly targetRect: DOMRect | null;
    };

/**
 * Persisted tutorial state stored in browser storage.
 */
export interface TutorialPersistedState {
  readonly version: 1;
  readonly hasSeenTutorial: boolean;
}