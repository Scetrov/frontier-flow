import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

describe("CompilationStatus deployment popup review", () => {
  it("renders target-aware success details including stage, severity, package id, and digest", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployed",
        targetId: "testnet:stillness",
        stage: "confirming",
        severity: "success",
        packageId: "0xabc123",
        confirmationReference: "7R4J3digest",
        nextActionSummary: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
      }),
    });

    render(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployed/i }));

    expect(screen.getAllByText("Deployed")).toHaveLength(2);
  expect(screen.getByText(`Artifact ID: ${artifact.artifactId ?? ""}`)).toBeVisible();
    expect(screen.getByText("Target: testnet:stillness")).toBeVisible();
    expect(screen.getByText("Stage: confirming")).toBeVisible();
    expect(screen.getByText("Severity: success")).toBeVisible();
    expect(screen.getByText("Package ID: 0xabc123")).toBeVisible();
    expect(screen.getByText("Transaction Digest: 7R4J3digest")).toBeVisible();
    expect(screen.getByText("Deployment completed for testnet:stillness. Package ID: 0xabc123.")).toBeVisible();
  });

  it("preserves prior session review entries when a later deployment succeeds", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployed",
        targetId: "testnet:stillness",
        stage: "confirming",
        severity: "success",
        packageId: "0xabc123",
        confirmationReference: "7R4J3digest",
        nextActionSummary: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
        reviewHistory: [
          createDeploymentReviewEntry({
            attemptId: "attempt-success",
            headline: "Deployed",
            targetId: "testnet:stillness",
            severity: "success",
            stage: "confirming",
            packageId: "0xabc123",
            confirmationReference: "7R4J3digest",
            details: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
            blockedReasons: [],
          }),
          createDeploymentReviewEntry({
            attemptId: "attempt-blocked",
            headline: "Deployment blocked",
            targetId: "local",
            severity: "error",
            stage: "validating",
            details: "Start or configure the local validator, then retry deployment to local.",
            blockedReasons: ["The local validator required for local deployment is unavailable."],
            historicalOnly: true,
            historicalReason: "Local validator state changed after this attempt. Re-verify this evidence before relying on it.",
          }),
        ],
      }),
    });

    render(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployed/i }));

    expect(screen.getByText("Earlier this session")).toBeVisible();
    expect(screen.getByText(/Deployment blocked - local - validating/)).toBeVisible();
    expect(screen.getByText("Transaction Digest: 7R4J3digest")).toBeVisible();
    expect(screen.getByText("Start or configure the local validator, then retry deployment to local.")).toBeVisible();
    expect(screen.getByText("Historical only")).toBeVisible();
    expect(screen.getByText("Local validator state changed after this attempt. Re-verify this evidence before relying on it.")).toBeVisible();
  });

  it("renders an explicit deployment review surface even when the current artifact is no longer active", () => {
    const deploymentStatus = createDeploymentStatus("deployed", {
      artifactId: "artifact-review-only",
      headline: "Deployed",
      targetId: "testnet:utopia",
      stage: "confirming",
      severity: "success",
      packageId: "0xfeedbeef",
      confirmationReference: "digest-explicit-02",
      nextActionSummary: "Deployment completed for testnet:utopia. Package ID: 0xfeedbeef.",
    });

    render(<CompilationStatus deploymentStatus={deploymentStatus} diagnostics={[]} status={{ state: "idle" }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployed/i }));

    expect(screen.getByText("Artifact ID: artifact-review-only")).toBeVisible();
    expect(screen.getByText("Target: testnet:utopia")).toBeVisible();
    expect(screen.getByText("Transaction Digest: digest-explicit-02")).toBeVisible();
  });
});
