import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MoveSourcePanel from "../components/MoveSourcePanel";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

describe("MoveSourcePanel deployment parity", () => {
  it("does not render deployment review content for completed deployments", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployed",
        targetId: "testnet:utopia",
        stage: "confirming",
        severity: "success",
        packageId: "0xdef456",
        confirmationReference: "digest-utopia-01",
        nextActionSummary: "Deployment completed for testnet:utopia. Package ID: 0xdef456.",
      }),
    });

    render(<MoveSourcePanel sourceCode={artifact.moveSource} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    expect(screen.queryByRole("region", { name: "Deployment review" })).not.toBeInTheDocument();
    expect(screen.queryByText("Target: testnet:utopia")).not.toBeInTheDocument();
    expect(screen.queryByText("Stage: confirming")).not.toBeInTheDocument();
    expect(screen.queryByText("Package ID: 0xdef456")).not.toBeInTheDocument();
    expect(screen.queryByText("Transaction Digest: digest-utopia-01")).not.toBeInTheDocument();
  });

  it("does not render prior deployment history inside the Move tab", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployed",
        targetId: "testnet:stillness",
        stage: "confirming",
        severity: "success",
        packageId: "0xabc123",
        nextActionSummary: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
        reviewHistory: [
          createDeploymentReviewEntry({
            attemptId: "attempt-success",
            headline: "Deployed",
            targetId: "testnet:stillness",
            severity: "success",
            stage: "confirming",
            packageId: "0xabc123",
            details: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
            blockedReasons: [],
          }),
          createDeploymentReviewEntry({
            attemptId: "attempt-cancelled",
            headline: "Deployment cancelled",
            targetId: "testnet:stillness",
            severity: "warning",
            stage: "signing",
            details: "Approve the wallet signing request to continue deployment.",
            blockedReasons: ["Deployment was cancelled because wallet approval was rejected for testnet:stillness."],
            historicalOnly: true,
            historicalReason: "Local validator state changed after this attempt. Re-verify this evidence before relying on it.",
          }),
        ],
      }),
    });

    render(<MoveSourcePanel sourceCode={artifact.moveSource} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    expect(screen.queryByText(/Earlier this session: Deployment cancelled - testnet:stillness - signing/)).not.toBeInTheDocument();
    expect(screen.queryByText("Approve the wallet signing request to continue deployment.")).not.toBeInTheDocument();
    expect(screen.queryByText("Historical only")).not.toBeInTheDocument();
    expect(screen.queryByText("Local validator state changed after this attempt. Re-verify this evidence before relying on it.")).not.toBeInTheDocument();
  });
});
