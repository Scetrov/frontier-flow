import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

describe("CompilationStatus deployment blocker details", () => {
  it("renders target, stage, blockers, and remediation for blocked deployments", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        targetId: "testnet:stillness",
        stage: "validating",
        requiredInputs: ["compiled bytecode artifact", "connected wallet", "published package references"],
        resolvedInputs: ["compiled bytecode artifact", "published package references"],
        blockedReasons: ["Connect a Sui-compatible wallet before deploying to testnet:stillness."],
        nextActionSummary: "Connect and approve the target wallet, then retry deployment.",
      }),
    });

    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Target: testnet:stillness")).toBeVisible();
    expect(screen.getByText("Stage: validating")).toBeVisible();
    expect(screen.getByText("Connect a Sui-compatible wallet before deploying to testnet:stillness.")).toBeVisible();
    expect(screen.getByText("Required inputs: compiled bytecode artifact, connected wallet, published package references")).toBeVisible();
    expect(screen.getByText("Resolved inputs: compiled bytecode artifact, published package references")).toBeVisible();
    expect(screen.getByText("Connect and approve the target wallet, then retry deployment.")).toBeVisible();
  });

  it("renders local-target remediation when local deployment is unavailable", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        targetId: "local",
        stage: "validating",
        requiredInputs: ["compiled bytecode artifact", "local deployment target"],
        resolvedInputs: ["compiled bytecode artifact"],
        blockedReasons: ["Local deployment is unavailable."],
        nextActionSummary: "Start or configure the local deployment target before retrying.",
      }),
    });

    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Target: local")).toBeVisible();
    expect(screen.getByText("Local deployment is unavailable.")).toBeVisible();
    expect(screen.getByText("Start or configure the local deployment target before retrying.")).toBeVisible();
  });

  it("renders failed deployment guidance without surfacing success metadata", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        outcome: "failed",
        headline: "Deployment failed",
        targetId: "testnet:stillness",
        stage: "submitting",
        severity: "error",
        blockedReasons: [],
        nextActionSummary: "Review the wallet and RPC error details, then retry deployment once the target is healthy.",
      }),
    });

    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Deployment failed")).toBeVisible();
    expect(screen.getByText("Target: testnet:stillness")).toBeVisible();
    expect(screen.getByText("Stage: submitting")).toBeVisible();
    expect(screen.getByText("Severity: error")).toBeVisible();
    expect(screen.queryByText(/^Package ID:/)).not.toBeInTheDocument();
    expect(screen.getByText("Review the wallet and RPC error details, then retry deployment once the target is healthy.")).toBeVisible();
  });

  it("renders unresolved deployment guidance with confirmation evidence retained", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        outcome: "unresolved",
        headline: "Deployment unresolved",
        targetId: "testnet:utopia",
        stage: "confirming",
        severity: "error",
        packageId: "0xabc123",
        confirmationReference: "0xdigest123",
        blockedReasons: [],
        nextActionSummary: "Retry confirmation or redeploy after checking the target network and transaction digest.",
        reviewHistory: [
          createDeploymentReviewEntry({
            attemptId: "attempt-unresolved",
            headline: "Deployment unresolved",
            targetId: "testnet:utopia",
            outcome: "unresolved",
            severity: "error",
            stage: "confirming",
            packageId: "0xabc123",
            confirmationReference: "0xdigest123",
            details: "Retry confirmation or redeploy after checking the target network and transaction digest.",
            blockedReasons: [],
          }),
        ],
      }),
    });

    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Deployment unresolved")).toBeVisible();
    expect(screen.getByText("Package ID: 0xabc123")).toBeVisible();
    expect(screen.getByText("Transaction Digest: 0xdigest123")).toBeVisible();
    expect(screen.getByText("Retry confirmation or redeploy after checking the target network and transaction digest.")).toBeVisible();
  });
});