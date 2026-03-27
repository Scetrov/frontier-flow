import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { getLocalDeploymentTargetLabel } from "../data/localEnvironment";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

describe("CompilationStatus deployment blocker details", () => {
  it("renders target, stage, blockers, and remediation for blocked deployments", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        targetId: "testnet:stillness",
        stage: "validating",
        requiredInputs: [
          "current compiled bytecode artifact",
          "connected Sui wallet for testnet:stillness",
          "published package references for testnet:stillness",
        ],
        resolvedInputs: ["current compiled bytecode artifact", "published package references for testnet:stillness"],
        blockedReasons: ["Connect a Sui-compatible wallet before deploying to testnet:stillness."],
        nextActionSummary: "Connect and approve a Sui-compatible wallet for testnet:stillness, then retry deployment.",
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
    expect(screen.getByText("Required inputs: current compiled bytecode artifact, connected Sui wallet for testnet:stillness, published package references for testnet:stillness")).toBeVisible();
    expect(screen.getByText("Resolved inputs: current compiled bytecode artifact, published package references for testnet:stillness")).toBeVisible();
    expect(screen.getByText("Connect and approve a Sui-compatible wallet for testnet:stillness, then retry deployment.")).toBeVisible();
  });

  it("renders local-target remediation when local deployment is unavailable", () => {
    const localTargetLabel = getLocalDeploymentTargetLabel();

    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        targetId: "local",
        stage: "validating",
        requiredInputs: [
          "current compiled bytecode artifact",
          `published package references for ${localTargetLabel}`,
          "available local validator",
        ],
        resolvedInputs: [
          "current compiled bytecode artifact",
          `published package references for ${localTargetLabel}`,
        ],
        blockedReasons: ["The local validator required for local deployment is unavailable."],
        nextActionSummary: "Start or configure the local validator, then retry deployment to local.",
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
    expect(screen.getByText("The local validator required for local deployment is unavailable.")).toBeVisible();
    expect(screen.getByText(`Required inputs: current compiled bytecode artifact, published package references for ${localTargetLabel}, available local validator`)).toBeVisible();
    expect(screen.getByText("Start or configure the local validator, then retry deployment to local.")).toBeVisible();
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

  it("renders preparation-stage failure details for remote compiler blockers", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("blocked", {
        outcome: "failed",
        headline: "Deployment failed",
        targetId: "testnet:stillness",
        stage: "preparing",
        severity: "error",
        blockedReasons: [],
        nextActionSummary: "Remote deployment cannot resolve the published world dependency in the browser Move compiler.",
      }),
    });

    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Stage: preparing")).toBeVisible();
    expect(screen.getByText("Remote deployment cannot resolve the published world dependency in the browser Move compiler.")).toBeVisible();
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