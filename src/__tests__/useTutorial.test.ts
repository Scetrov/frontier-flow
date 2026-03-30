import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorial, RETRY_DELAY_MS, MAX_RETRIES } from "../hooks/useTutorial";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";

const TUTORIAL_STORAGE_KEY = "frontier-flow:tutorial";

function setPersistedDrawerState(input: { readonly isContractPanelOpen: boolean; readonly isSidebarOpen: boolean }) {
  window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({
    version: 1,
    activeView: "visual",
    currentDraftContractName: null,
    selectedDeploymentTarget: "local",
    isSidebarOpen: input.isSidebarOpen,
    isContractPanelOpen: input.isContractPanelOpen,
  }));
}

function setBoundingRect(element: Element, input: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(input.left, input.top, input.width, input.height),
  });
}

function renderTutorialHook(input?: {
  readonly activeView?: "visual" | "move" | "deploy" | "authorize";
  readonly isCanvasReady?: boolean;
  readonly onSetDrawerVisibility?: (drawer: "sidebar" | "contract-panel", open: boolean) => void;
  readonly onInsertDemoNode?: () => void;
  readonly onRemoveDemoNode?: () => void;
}) {
  const onSetDrawerVisibility = input?.onSetDrawerVisibility ?? vi.fn();
  const onInsertDemoNode = input?.onInsertDemoNode ?? vi.fn();
  const onRemoveDemoNode = input?.onRemoveDemoNode ?? vi.fn();

  return renderHook(
    ({ activeView, isCanvasReady }) => useTutorial({
      activeView,
      isCanvasReady,
      onSetDrawerVisibility,
      onInsertDemoNode,
      onRemoveDemoNode,
    }),
    {
      initialProps: {
        activeView: input?.activeView ?? "visual",
        isCanvasReady: input?.isCanvasReady ?? false,
      },
    },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useTutorial", () => {
  it("starts from step one and persists the tutorial as seen", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 40, top: 24, width: 160, height: 48 });
    document.body.append(networkSelector);

    const { result } = renderTutorialHook();

    act(() => {
      result.current.start();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep?.id).toBe("network-selector");
    expect(result.current.targetRect?.width).toBe(160);
    expect(networkSelector).toHaveClass("ff-tutorial__target");
    expect(JSON.parse(window.localStorage.getItem(TUTORIAL_STORAGE_KEY) ?? "{}")).toMatchObject({
      hasSeenTutorial: true,
      version: 1,
    });
  });

  it("auto-starts for first-time users after the canvas is ready", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 16, top: 16, width: 100, height: 40 });
    document.body.append(networkSelector);

    const { result } = renderTutorialHook({ isCanvasReady: true });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep?.id).toBe("network-selector");
  });

  it("recovers from corrupt persisted data and still auto-starts", () => {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "{not-json");
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 10, top: 10, width: 120, height: 36 });
    document.body.append(networkSelector);

    const { result } = renderTutorialHook({ isCanvasReady: true });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isActive).toBe(true);
  });

  it("opens required drawers and skips steps that cannot resolve after retries", () => {
    const onSetDrawerVisibility = vi.fn<(drawer: "sidebar" | "contract-panel", open: boolean) => void>();
    setPersistedDrawerState({ isContractPanelOpen: true, isSidebarOpen: true });

    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 10, top: 10, width: 120, height: 36 });
    document.body.append(networkSelector);

    const socket = document.createElement("div");
    socket.className = "ff-node__socket";
    setBoundingRect(socket, { left: 100, top: 100, width: 32, height: 32 });
    document.body.append(socket);

    const { result } = renderTutorialHook({ onSetDrawerVisibility });

    act(() => {
      result.current.start();
    });

    onSetDrawerVisibility.mockClear();

    act(() => {
      result.current.next();
    });

    expect(result.current.currentStep?.id).toBe("toolbox");
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("sidebar", true);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("contract-panel", true);

    onSetDrawerVisibility.mockClear();

    act(() => {
      // Advance time long enough for the tutorial target-measure retries
      // to exhaust and for the step-skipping timeout to fire.
      vi.advanceTimersByTime((MAX_RETRIES * RETRY_DELAY_MS) + RETRY_DELAY_MS);
    });

    expect(result.current.currentStep?.id).toBe("socket");
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("sidebar", false);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("contract-panel", false);
  });

  it("inserts and removes the demo node around the socket step", () => {
    setPersistedDrawerState({ isContractPanelOpen: true, isSidebarOpen: false });
    const onInsertDemoNode = vi.fn();
    const onRemoveDemoNode = vi.fn();
    const onSetDrawerVisibility = vi.fn<(drawer: "sidebar" | "contract-panel", open: boolean) => void>();

    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 10, top: 10, width: 120, height: 36 });
    document.body.append(networkSelector);

    const toolbox = document.createElement("aside");
    toolbox.id = "node-toolbox";
    setBoundingRect(toolbox, { left: 800, top: 80, width: 240, height: 520 });
    document.body.append(toolbox);

    const socket = document.createElement("div");
    socket.className = "ff-node__socket";
    setBoundingRect(socket, { left: 120, top: 120, width: 24, height: 24 });
    document.body.append(socket);

    const { result } = renderTutorialHook({ onInsertDemoNode, onRemoveDemoNode, onSetDrawerVisibility });

    act(() => {
      result.current.start();
      result.current.next();
      result.current.next();
    });

    expect(result.current.currentStep?.id).toBe("socket");
    expect(onInsertDemoNode).toHaveBeenCalledTimes(1);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("sidebar", false);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("contract-panel", false);

    onSetDrawerVisibility.mockClear();

    act(() => {
      result.current.dismiss();
    });

    expect(onRemoveDemoNode).toHaveBeenCalledTimes(1);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("sidebar", false);
    expect(onSetDrawerVisibility).toHaveBeenCalledWith("contract-panel", true);
    expect(result.current.isActive).toBe(false);
  });

  it("dismisses when the user leaves the visual designer view", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 10, top: 10, width: 120, height: 36 });
    document.body.append(networkSelector);

    const { result, rerender } = renderTutorialHook();

    act(() => {
      result.current.start();
    });

    rerender({ activeView: "move", isCanvasReady: false });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBeNull();
  });

  it("recalculates the target rect on debounced resize", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 24, top: 20, width: 100, height: 40 });
    document.body.append(networkSelector);

    const { result } = renderTutorialHook();

    act(() => {
      result.current.start();
    });

    expect(result.current.targetRect?.width).toBe(100);

    setBoundingRect(networkSelector, { left: 32, top: 28, width: 180, height: 64 });

    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(100);
    });

    expect(result.current.targetRect?.width).toBe(180);
    expect(result.current.targetRect?.height).toBe(64);
  });

  it("cancels pending debounced resize work during cleanup", () => {
    const networkSelector = document.createElement("button");
    networkSelector.setAttribute("aria-label", "Target network/server");
    setBoundingRect(networkSelector, { left: 24, top: 20, width: 100, height: 40 });
    document.body.append(networkSelector);
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

    const { result, unmount } = renderTutorialHook();

    act(() => {
      result.current.start();
    });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    const clearTimeoutCallsBeforeCleanup = clearTimeoutSpy.mock.calls.length;

    act(() => {
      unmount();
    });

    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(clearTimeoutCallsBeforeCleanup);
    clearTimeoutSpy.mockRestore();
  });
});