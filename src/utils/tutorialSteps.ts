import type { TutorialStepDefinition } from "../types/tutorial";

function getDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function queryTarget(selector: string): HTMLElement | null {
  return getDocument()?.querySelector<HTMLElement>(selector) ?? null;
}

function getSocketTarget(): HTMLElement | null {
  const doc = getDocument();
  if (doc === null) {
    return null;
  }

  return doc.querySelector<HTMLElement>('.react-flow__viewport [data-node-id="tutorial-demo-node"] .ff-node__socket[data-socket-direction="output"]')
    ?? doc.querySelector<HTMLElement>('.react-flow__viewport .ff-node__socket[data-socket-direction="output"]')
    ?? null;
}

/**
 * Ordered tutorial step definitions for the Visual Designer walkthrough.
 */
export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    id: "network-selector",
    ordinal: 1,
    message: "Select the network you want to deploy to here",
    tooltipPosition: "bottom",
    resolveTarget: () => queryTarget('[aria-label="Target network/server"]'),
    requiresDrawerOpen: null,
    requiresDemoNode: false,
  },
  {
    id: "toolbox",
    ordinal: 2,
    message: "Drag nodes from here into the canvas to create a flow.",
    tooltipPosition: "left",
    resolveTarget: () => getDocument()?.getElementById("node-toolbox") ?? null,
    requiresDrawerOpen: "sidebar",
    requiresDemoNode: false,
  },
  {
    id: "socket",
    ordinal: 3,
    message: "Drag from a socket to a matching socket to connect two nodes",
    tooltipPosition: "bottom",
    resolveTarget: getSocketTarget,
    requiresDrawerOpen: null,
    requiresDemoNode: true,
  },
  {
    id: "save-load",
    ordinal: 4,
    message: "You can save or load a previous flow from the Browser Storage, or export YAML to share",
    tooltipPosition: "right",
    resolveTarget: () => getDocument()?.getElementById("saved-contract-controls") ?? null,
    requiresDrawerOpen: "contract-panel",
    requiresDemoNode: false,
  },
  {
    id: "view-navigation",
    ordinal: 5,
    message: "Once your flow is complete, move on to review the code and Deploy from here",
    tooltipPosition: "bottom",
    resolveTarget: () => queryTarget(".ff-header__nav"),
    requiresDrawerOpen: null,
    requiresDemoNode: false,
  },
] as const;

export const TUTORIAL_DEMO_NODE_ID = "tutorial-demo-node";