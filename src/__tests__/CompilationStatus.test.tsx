import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CompilationStatus from "../components/CompilationStatus";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

const compiledArtifact = createGeneratedArtifactStub();

describe("CompilationStatus", () => {
  it("renders all primary states", () => {
    const { rerender } = render(<CompilationStatus diagnostics={[]} status={{ state: "idle" }} />);
    expect(screen.getByText("Idle")).toBeVisible();

    rerender(<CompilationStatus diagnostics={[]} status={{ state: "compiling" }} />);
    expect(screen.getByText("Compiling")).toBeVisible();

    rerender(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );
    expect(screen.getByText("Compiled")).toBeVisible();
  });

  it("expands error details and forwards node selection", () => {
    const handleSelectDiagnostic = vi.fn();

    render(
      <CompilationStatus
        diagnostics={[
          {
            severity: "error",
            rawMessage: "broken",
            line: 12,
            reactFlowNodeId: "node_1",
            socketId: null,
            userMessage: "Broken graph",
          },
        ]}
        onSelectDiagnostic={handleSelectDiagnostic}
        status={{
          state: "error",
          diagnostics: [
            {
              severity: "error",
              rawMessage: "broken",
              line: 12,
              reactFlowNodeId: "node_1",
              socketId: null,
              userMessage: "Broken graph",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Error/i }));
    fireEvent.click(screen.getByRole("button", { name: "Broken graph" }));

    expect(handleSelectDiagnostic).toHaveBeenCalledWith("node_1");
  });

  it("renders deployment status metadata from the active artifact", () => {
    render(
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.getByText("Deployment Blocked")).toBeVisible();
    expect(screen.queryByText(/Provide the target turret package and extension registration details to continue deployment/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Deployment Blocked/i }));

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
      <CompilationStatus
        diagnostics={[]}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    expect(screen.getByText(label)).toBeVisible();
    expect(screen.queryByText(summary)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "i") }));

    expect(screen.getByText(summary)).toBeVisible();
  });
});