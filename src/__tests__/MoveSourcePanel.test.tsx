import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MoveSourcePanel from "../components/MoveSourcePanel";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

const compiledArtifact = createGeneratedArtifactStub();

describe("MoveSourcePanel", () => {
  it("renders read-only Move source without altering the generated formatting", () => {
    const sourceCode = `module builder_extensions::starter_contract {
    public fun execute() {
        let compiled = true;
    }
}`;

    const { container } = render(
      <MoveSourcePanel
        sourceCode={sourceCode}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.getByLabelText("Move source view")).toBeInTheDocument();
    expect(screen.getByText("Generated source")).toBeVisible();
    expect(screen.getByText(/module builder_extensions::starter_contract/)).toBeVisible();
    expect(screen.getByLabelText("Generated Move source code").textContent).toBe(sourceCode);
    expect(container.querySelector(".hljs-keyword")).not.toBeNull();
    expect(screen.getByRole("region", { name: "Move source view" })).toBeInTheDocument();
  });

  it("shows an empty state when no source is available", () => {
    render(<MoveSourcePanel sourceCode={null} status={{ state: "error", diagnostics: [] }} />);

    expect(screen.getByText("No generated Move source yet")).toBeVisible();
    expect(screen.getByText(/Resolve graph validation issues or compile errors/)).toBeVisible();
  });

  it("shows the generated artifact filename when one is available", () => {
    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.getByText("starter_contract.move")).toBeVisible();
  });

  it("surfaces deployment status metadata alongside the artifact", () => {
    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.getByText("Deployment Blocked")).toBeVisible();
    expect(screen.getByText(/Provide the target turret package and extension registration details to continue deployment/i)).toBeVisible();
  });

  it.each([
    ["ready", "Deployment Ready", "Ready to deploy the generated artifact to the selected turret."],
    ["deployed", "Deployment Deployed", "Deployment completed for the selected turret."],
  ] as const)("renders %s deployment state", (status, label, summary) => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus(status, { nextActionSummary: summary }),
    });

    render(
      <MoveSourcePanel
        sourceCode={artifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByText(summary)).toBeVisible();
  });
});