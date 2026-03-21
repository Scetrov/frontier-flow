import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

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
});