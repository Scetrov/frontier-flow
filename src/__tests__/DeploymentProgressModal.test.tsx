import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DeploymentProgressModal from "../components/DeploymentProgressModal";
import { createDeploymentAttemptFixture, createDeploymentProgressFixture } from "./deployment/testFactories";

describe("DeploymentProgressModal", () => {
  it("renders active deployment progress with the current stage and progress bar", () => {
    render(
      <DeploymentProgressModal
        latestAttempt={null}
        onDismiss={() => undefined}
        progress={createDeploymentProgressFixture({
          targetId: "testnet:stillness",
          stage: "preparing",
          stageIndex: 1,
          stageCount: 5,
          completedStages: ["validating"],
          activeMessage: "Preparing deployment payload for testnet:stillness.",
        })}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployment in progress" })).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("Target: testnet:stillness")).toBeVisible();
    expect(screen.getByText("Preparing deployment payload for testnet:stillness.")).toBeVisible();
    expect(screen.getByText("Preparing")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
  });

  it("renders terminal deployment summaries and supports dismissal", () => {
    const handleDismiss = vi.fn();
    const progress = createDeploymentProgressFixture({
      attemptId: "attempt-42",
      targetId: "local",
      stage: "confirming",
      stageIndex: 4,
      stageCount: 5,
      completedStages: ["validating", "preparing", "signing", "submitting"],
      activeMessage: "Confirming deployment.",
    });

    render(
      <DeploymentProgressModal
        latestAttempt={createDeploymentAttemptFixture({
          attemptId: "attempt-42",
          targetId: "local",
          outcome: "succeeded",
          currentStage: "confirming",
          endedAt: 10,
          message: "Deployment completed for local. Package ID: 0xabc.",
          packageId: "0xabc",
        })}
        onDismiss={handleDismiss}
        progress={progress}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployed" })).toBeVisible();
    expect(screen.getByText("Deployment completed for local. Package ID: 0xabc.")).toBeVisible();
    expect(screen.getAllByText("Complete")).toHaveLength(5);
    expect(screen.queryByText("Active")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the modal, traps keyboard focus, and supports escape dismissal", () => {
    const handleDismiss = vi.fn();
    const progress = createDeploymentProgressFixture({
      targetId: "testnet:stillness",
      stage: "signing",
      stageIndex: 2,
      stageCount: 5,
      completedStages: ["validating", "preparing"],
      activeMessage: "Waiting for wallet approval.",
    });

    const { rerender } = render(
      <>
        <button type="button">Open deploy modal</button>
      </>,
    );

    const opener = screen.getByRole("button", { name: "Open deploy modal" });
    opener.focus();

    rerender(
      <>
        <button type="button">Open deploy modal</button>
        <DeploymentProgressModal latestAttempt={null} onDismiss={handleDismiss} progress={progress} />
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "Deployment in progress" });
    const dismissButton = screen.getByRole("button", { name: "Dismiss" });

    expect(dismissButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab" });

    expect(dismissButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(handleDismiss).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <button type="button">Open deploy modal</button>
        <DeploymentProgressModal
          latestAttempt={null}
          onDismiss={handleDismiss}
          progress={{
            ...progress,
            dismissedByUser: true,
          }}
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Open deploy modal" })).toHaveFocus();
  });
});