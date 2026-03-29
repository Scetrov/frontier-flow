import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TutorialOverlay from "../components/TutorialOverlay";
import type { TutorialStepDefinition } from "../types/tutorial";

function createStep(overrides?: Partial<TutorialStepDefinition>): TutorialStepDefinition {
  return {
    id: "network-selector",
    message: "Select the network you want to deploy to here",
    ordinal: 1,
    requiresDemoNode: false,
    requiresDrawerOpen: null,
    resolveTarget: () => null,
    tooltipPosition: "bottom",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 768 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TutorialOverlay", () => {
  it("renders nothing when the tutorial is inactive", () => {
    const { container } = render(
      <TutorialOverlay
        currentStep={null}
        currentStepIndex={-1}
        isActive={false}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={null}
        totalSteps={5}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the spotlight, progress, dots, and actions when active", () => {
    render(
      <TutorialOverlay
        currentStep={createStep()}
        currentStepIndex={1}
        isActive={true}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={new DOMRect(40, 60, 180, 50)}
        totalSteps={5}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Step 2 of 5")).toBeVisible();
    expect(screen.getByText("Select the network you want to deploy to here")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();
    expect(document.querySelectorAll(".ff-tutorial__progress-dot")).toHaveLength(5);
    expect(document.querySelectorAll(".ff-tutorial__progress-dot--active")).toHaveLength(1);
  });

  it("positions the spotlight from the target rect with padding", () => {
    const { container } = render(
      <TutorialOverlay
        currentStep={createStep()}
        currentStepIndex={0}
        isActive={true}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={new DOMRect(20, 30, 100, 40)}
        totalSteps={5}
      />,
    );

    const spotlight = container.querySelector(".ff-tutorial__spotlight");
    if (spotlight === null) {
      throw new Error("Expected spotlight element to render.");
    }

    expect(spotlight).toHaveStyle({
      top: "22px",
      left: "12px",
      width: "116px",
      height: "56px",
    });
  });

  it("fires Next, Finish, and Dismiss callbacks", () => {
    const onNext = vi.fn();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <TutorialOverlay
        currentStep={createStep()}
        currentStepIndex={0}
        isActive={true}
        onDismiss={onDismiss}
        onNext={onNext}
        targetRect={new DOMRect(40, 60, 180, 50)}
        totalSteps={5}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    rerender(
      <TutorialOverlay
        currentStep={createStep({ id: "view-navigation", ordinal: 5, tooltipPosition: "bottom" })}
        currentStepIndex={4}
        isActive={true}
        onDismiss={onDismiss}
        onNext={onNext}
        targetRect={new DOMRect(40, 60, 180, 50)}
        totalSteps={5}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(onNext).toHaveBeenCalledTimes(2);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("traps focus within the tooltip and dismisses on Escape", () => {
    const onDismiss = vi.fn();

    render(
      <TutorialOverlay
        currentStep={createStep()}
        currentStepIndex={0}
        isActive={true}
        onDismiss={onDismiss}
        onNext={() => undefined}
        targetRect={new DOMRect(40, 60, 180, 50)}
        totalSteps={5}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps the tooltip inside the viewport when the preferred side would overflow", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 420 });

    render(
      <TutorialOverlay
        currentStep={createStep({ tooltipPosition: "right" })}
        currentStepIndex={0}
        isActive={true}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={new DOMRect(360, 40, 40, 40)}
        totalSteps={5}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const dialog = screen.getByRole("dialog");
    expect(Number.parseInt(dialog.style.left, 10)).toBeLessThanOrEqual(92);
  });

  it("toggles the visibility class during step changes", () => {
    const { rerender } = render(
      <TutorialOverlay
        currentStep={createStep({ id: "network-selector" })}
        currentStepIndex={0}
        isActive={true}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={new DOMRect(40, 60, 180, 50)}
        totalSteps={5}
      />,
    );

    const dialog = screen.getByRole("dialog");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(dialog).toHaveClass("ff-tutorial__panel--visible");

    rerender(
      <TutorialOverlay
        currentStep={createStep({ id: "toolbox", ordinal: 2, message: "Drag nodes from here into the canvas to create a flow.", tooltipPosition: "left" })}
        currentStepIndex={1}
        isActive={true}
        onDismiss={() => undefined}
        onNext={() => undefined}
        targetRect={new DOMRect(420, 60, 180, 200)}
        totalSteps={5}
      />,
    );

    expect(screen.getByRole("dialog")).not.toHaveClass("ff-tutorial__panel--visible");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole("dialog")).toHaveClass("ff-tutorial__panel--visible");
  });
});