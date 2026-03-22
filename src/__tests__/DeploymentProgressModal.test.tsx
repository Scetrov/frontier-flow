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
    expect(document.querySelector(".ff-deployment-modal__message")?.textContent).toBe("Preparing deployment payload for testnet:stillness.");
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
          confirmationReference: "0xdigest42",
          packageId: "0xabc",
        })}
        onDismiss={handleDismiss}
        progress={progress}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployed" })).toBeVisible();
    expect(screen.getByText("Deployment completed for local. Package ID: 0xabc.")).toBeVisible();
    expect(screen.getByText("Package ID: 0xabc")).toBeVisible();
    expect(screen.getByText("Transaction Digest: 0xdigest42")).toBeVisible();
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

  it("renders a target-confirmed success path through confirming before terminal completion", () => {
    const progress = createDeploymentProgressFixture({
      attemptId: "attempt-99",
      targetId: "testnet:stillness",
      stage: "confirming",
      stageIndex: 4,
      stageCount: 5,
      completedStages: ["validating", "preparing", "signing", "submitting"],
      activeMessage: "Confirming deployment transaction.",
    });

    render(
      <DeploymentProgressModal
        latestAttempt={createDeploymentAttemptFixture({
          attemptId: "attempt-99",
          targetId: "testnet:stillness",
          outcome: "succeeded",
          currentStage: "confirming",
          endedAt: 15,
          message: "Deployment completed for testnet:stillness. Package ID: 0xdef.",
          packageId: "0xdef",
          confirmationReference: "0xconfirm99",
        })}
        onDismiss={() => undefined}
        progress={progress}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployed" })).toBeVisible();
    expect(screen.getByText("Target: testnet:stillness")).toBeVisible();
    expect(screen.getByText("Package ID: 0xdef")).toBeVisible();
    expect(screen.getByText("Transaction Digest: 0xconfirm99")).toBeVisible();
    expect(screen.getAllByText("Complete")).toHaveLength(5);
  });

  it("announces unresolved outcomes and renders retry guidance", () => {
    const progress = createDeploymentProgressFixture({
      attemptId: "attempt-unresolved",
      targetId: "testnet:utopia",
      stage: "confirming",
      stageIndex: 4,
      stageCount: 5,
      completedStages: ["validating", "preparing", "signing", "submitting"],
      activeMessage: "Confirming deployment.",
    });

    render(
      <DeploymentProgressModal
        latestAttempt={createDeploymentAttemptFixture({
          attemptId: "attempt-unresolved",
          targetId: "testnet:utopia",
          outcome: "unresolved",
          currentStage: "confirming",
          endedAt: 11,
          message: "Deployment submission for testnet:utopia could not be confirmed within the verification window.",
          packageId: "0xabc",
          confirmationReference: "0xdigest",
          errorCode: "confirmation-timeout",
        })}
        onDismiss={() => undefined}
        progress={progress}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployment unresolved" })).toBeVisible();
    expect(screen.getByText("Retry confirmation or redeploy after checking the target network and transaction digest.")).toBeVisible();
    expect(screen.getByText("Package ID: 0xabc")).toBeVisible();
    expect(screen.getByText("Transaction Digest: 0xdigest")).toBeVisible();
  });

  it("announces failed outcomes and renders retry guidance", () => {
    const progress = createDeploymentProgressFixture({
      attemptId: "attempt-failed",
      targetId: "testnet:stillness",
      stage: "submitting",
      stageIndex: 3,
      stageCount: 5,
      completedStages: ["validating", "preparing", "signing"],
      activeMessage: "Submitting deployment transaction.",
    });

    render(
      <DeploymentProgressModal
        latestAttempt={createDeploymentAttemptFixture({
          attemptId: "attempt-failed",
          targetId: "testnet:stillness",
          outcome: "failed",
          currentStage: "submitting",
          endedAt: 12,
          message: "Deployment submission to testnet:stillness failed before confirmation completed.",
          errorCode: "submission-failed",
        })}
        onDismiss={() => undefined}
        progress={progress}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Deployment failed" })).toBeVisible();
    expect(screen.getByText("Review the wallet and RPC error details, then retry deployment once the target is healthy.")).toBeVisible();
  });
});