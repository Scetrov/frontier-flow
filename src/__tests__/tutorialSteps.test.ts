import { afterEach, describe, expect, it } from "vitest";

import { TUTORIAL_STEPS } from "../utils/tutorialSteps";

const expectedMessages = [
  "Select the network you want to deploy to here",
  "Drag nodes from here into the canvas to create a flow.",
  "Drag from a socket to a matching socket to connect two nodes",
  "You can save or load a previous flow from the Browser Storage, or export YAML to share",
  "Once your flow is complete, move on to review the code and Deploy from here",
] as const;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("tutorial step definitions", () => {
  it("defines the expected five tutorial steps in order", () => {
    expect(TUTORIAL_STEPS).toHaveLength(5);
    expect(TUTORIAL_STEPS.map((step) => step.id)).toEqual([
      "network-selector",
      "toolbox",
      "socket",
      "save-load",
      "view-navigation",
    ]);
    expect(TUTORIAL_STEPS.map((step) => step.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(TUTORIAL_STEPS.map((step) => step.message)).toEqual(expectedMessages);
  });

  it("matches the documented tooltip positions and drawer requirements", () => {
    expect(TUTORIAL_STEPS.map((step) => step.tooltipPosition)).toEqual([
      "bottom",
      "left",
      "bottom",
      "right",
      "bottom",
    ]);
    expect(TUTORIAL_STEPS.map((step) => step.requiresDrawerOpen)).toEqual([
      null,
      "sidebar",
      null,
      "contract-panel",
      null,
    ]);
    expect(TUTORIAL_STEPS.map((step) => step.requiresDemoNode)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("resolves the expected DOM targets for every step", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    document.body.append(networkSelector);

    const toolbox = document.createElement("aside");
    toolbox.id = "node-toolbox";
    document.body.append(toolbox);

    const genericSocket = document.createElement("div");
    genericSocket.className = "ff-node__socket";
    document.body.append(genericSocket);

    const saveLoad = document.createElement("aside");
    saveLoad.id = "saved-contract-controls";
    document.body.append(saveLoad);

    const navigation = document.createElement("nav");
    navigation.className = "ff-header__nav";
    document.body.append(navigation);

    expect(TUTORIAL_STEPS[0].resolveTarget()).toBe(networkSelector);
    expect(TUTORIAL_STEPS[1].resolveTarget()).toBe(toolbox);
    expect(TUTORIAL_STEPS[2].resolveTarget()).toBe(genericSocket);
    expect(TUTORIAL_STEPS[3].resolveTarget()).toBe(saveLoad);
    expect(TUTORIAL_STEPS[4].resolveTarget()).toBe(navigation);
  });

  it("prefers the demo-node socket when one is present", () => {
    const genericSocket = document.createElement("div");
    genericSocket.className = "ff-node__socket";
    document.body.append(genericSocket);

    const demoNode = document.createElement("div");
    demoNode.setAttribute("data-node-id", "tutorial-demo-node");
    const demoSocket = document.createElement("div");
    demoSocket.className = "ff-node__socket";
    demoSocket.setAttribute("data-socket-direction", "output");
    demoNode.append(demoSocket);
    document.body.append(demoNode);

    expect(TUTORIAL_STEPS[2].resolveTarget()).toBe(demoSocket);
  });
});