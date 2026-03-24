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
    expect(screen.getByText("You can view the generated source in this tab to help diagnose problems, move on to Deploy to deploy to the server.")).toBeVisible();
    expect(screen.getByText(/Learn how to extend this code using/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Learn Move on Sui" })).toHaveAttribute("href", "https://evefrontier.space/move/");
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

  it("does not render deployment review content for blocked deployment state", () => {
    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{
          state: "compiled",
          bytecode: [new Uint8Array([1])],
          artifact: createGeneratedArtifactStub({
            deploymentStatus: createDeploymentStatus("blocked", {
              targetId: "local",
              nextActionSummary: "Provide the target turret package and extension registration details to continue deployment.",
            }),
          }),
        }}
      />,
    );

    expect(screen.queryByRole("region", { name: "Deployment review" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Provide the target turret package and extension registration details to continue deployment/i)).not.toBeInTheDocument();
  });

  it("does not render the previous header chips", () => {
    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.queryByText("starter_contract.move")).not.toBeInTheDocument();
    expect(screen.queryAllByText("Compiled")).toHaveLength(0);
  });

  it("does not render deployment review content for ready deployment state", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("ready", {
        nextActionSummary: "Ready to deploy the generated artifact to the selected turret.",
        targetId: "testnet:stillness",
      }),
    });

    render(
      <MoveSourcePanel
        sourceCode={artifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    expect(screen.queryByRole("region", { name: "Deployment review" })).not.toBeInTheDocument();
    expect(screen.queryByText("Target: testnet:stillness")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to deploy the generated artifact to the selected turret.")).not.toBeInTheDocument();
  });
});