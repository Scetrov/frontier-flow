import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MoveSourcePanel from "../components/MoveSourcePanel";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

describe("MoveSourcePanel deployment parity", () => {
  it("renders target, stage, severity, headline, and package metadata for the latest deployment", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployment deployed",
        targetId: "testnet:utopia",
        stage: "confirming",
        severity: "success",
        packageId: "0xdef456",
        nextActionSummary: "Deployment completed for testnet:utopia. Package ID: 0xdef456.",
      }),
    });

    render(<MoveSourcePanel sourceCode={artifact.moveSource} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    expect(screen.getByText("Deployment deployed")).toBeVisible();
    expect(screen.getByText("testnet:utopia")).toBeVisible();
    expect(screen.getByText("confirming")).toBeVisible();
    expect(screen.getByText("success")).toBeVisible();
    expect(screen.getByText("0xdef456")).toBeVisible();
  });

  it("shows prior session deployment review entries alongside the latest summary", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployment deployed",
        targetId: "testnet:stillness",
        stage: "confirming",
        severity: "success",
        packageId: "0xabc123",
        nextActionSummary: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
        reviewHistory: [
          createDeploymentReviewEntry({
            attemptId: "attempt-success",
            headline: "Deployment deployed",
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
          }),
        ],
      }),
    });

    render(<MoveSourcePanel sourceCode={artifact.moveSource} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    expect(screen.getByText(/Earlier this session: Deployment cancelled - testnet:stillness - signing/)).toBeVisible();
    expect(screen.getByText("Approve the wallet signing request to continue deployment.")).toBeVisible();
  });
});
