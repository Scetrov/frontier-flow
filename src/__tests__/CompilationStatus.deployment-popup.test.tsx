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
            details: "Start or configure the local deployment target before retrying.",
            blockedReasons: ["Local deployment is unavailable."],
          }),
        ],
      }),
    });

    render(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployed/i }));

    expect(screen.getByText("Earlier this session")).toBeVisible();
    expect(screen.getByText(/Deployment blocked - local - validating/)).toBeVisible();
    expect(screen.getByText("Transaction Digest: 7R4J3digest")).toBeVisible();
    expect(screen.getByText("Start or configure the local deployment target before retrying.")).toBeVisible();
  });
});
