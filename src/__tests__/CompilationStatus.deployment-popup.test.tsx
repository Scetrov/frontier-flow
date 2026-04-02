import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { createDeploymentReviewEntry, createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";
import {
  EMPTY_PUBLISH_PAYLOAD_MESSAGE,
  createEmptyPublishPayloadReviewEntryFixture,
  createEmptyPublishPayloadStatusFixture,
} from "./deployment/testFactories";

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

  it("renders blocked empty-publish review details instead of a raw chain parser failure", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createEmptyPublishPayloadStatusFixture({
        artifactId: "artifact-empty-publish",
        targetId: "local",
        reviewHistory: [
          createEmptyPublishPayloadReviewEntryFixture({
            attemptId: "attempt-empty-publish",
            artifactId: "artifact-empty-publish",
            targetId: "local",
          }),
        ],
      }),
    });

    render(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

    expect(screen.getByText("Artifact ID: artifact-empty-publish")).toBeVisible();
    expect(screen.getByText("Target: local")).toBeVisible();
    expect(screen.getByText("Stage: deploy-grade-compile")).toBeVisible();
    expect(screen.getByText("Severity: error")).toBeVisible();
    expect(screen.getByText(EMPTY_PUBLISH_PAYLOAD_MESSAGE)).toBeVisible();
    expect(screen.getByText("Rebuild or refresh the deployment package so the final publish payload contains compiled Move modules, then retry deployment.")).toBeVisible();
    expect(screen.queryByText(/TransferObjects, MergeCoin, and Publish cannot have empty arguments/i)).not.toBeInTheDocument();
  });

  it("shows an earlier empty-publish block alongside a later successful retry", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        headline: "Deployed",
        targetId: "local",
        stage: "confirming",
        severity: "success",
        packageId: "0xabc123",
        confirmationReference: "0xdigest",
        nextActionSummary: "Deployment completed for localnet. Package ID: 0xabc123.",
        reviewHistory: [
          createDeploymentReviewEntry({
            attemptId: "attempt-success",
            headline: "Deployed",
            targetId: "local",
            outcome: "succeeded",
            severity: "success",
            stage: "confirming",
            packageId: "0xabc123",
            confirmationReference: "0xdigest",
            details: "Deployment completed for localnet. Package ID: 0xabc123.",
            blockedReasons: [],
          }),
          createEmptyPublishPayloadReviewEntryFixture({
            attemptId: "attempt-empty-publish",
            artifactId: "starter_contract-00000000",
            targetId: "local",
          }),
        ],
      }),
    });

    render(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }} />);

    fireEvent.click(screen.getByRole("button", { name: /Deployed/i }));

    expect(screen.getByText("Earlier this session")).toBeVisible();
    expect(screen.getByText(/Deployment blocked - local - deploy-grade-compile/)).toBeVisible();
    expect(screen.getByText("Rebuild or refresh the deployment package so the final publish payload contains compiled Move modules, then retry deployment.")).toBeVisible();
  });
});
