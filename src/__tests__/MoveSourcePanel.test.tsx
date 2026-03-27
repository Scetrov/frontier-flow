import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MoveSourcePanel from "../components/MoveSourcePanel";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

const compiledArtifact = createGeneratedArtifactStub();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MoveSourcePanel", () => {
  it("renders read-only Move source without altering the generated formatting", () => {
    const sourceCode = `module builder_extensions::starter_contract {
    public fun execute() {
        let compiled = true;
    }
}`;
    const artifact = createGeneratedArtifactStub({
      moveSource: sourceCode,
      sourceFiles: [{ path: "sources/starter_contract.move", content: sourceCode }],
    });

    const { container } = render(
      <MoveSourcePanel
        sourceCode={sourceCode}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    expect(screen.getByLabelText("Move source view")).toBeInTheDocument();
    expect(screen.getByText("Generated source")).toBeVisible();
    expect(screen.getByText("Inspect the generated Move package in this tab to diagnose issues before switching to Deploy.")).toBeVisible();
    expect(screen.getByText(/Learn how to extend this code using/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Learn Move on Sui" })).toHaveAttribute("href", "https://evefrontier.space/move/");
    expect(screen.getByRole("tab", { name: artifact.sourceFilePath })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "/Move.toml" })).toBeVisible();
    expect(screen.getByText(/module builder_extensions::starter_contract/)).toBeVisible();
    expect(screen.getByLabelText(`${artifact.sourceFilePath} contents`).textContent).toBe(sourceCode);
    expect(container.querySelector(".hljs-keyword")).not.toBeNull();
    expect(screen.getByRole("region", { name: "Move source view" })).toBeInTheDocument();
  });

  it("lets the user inspect root Move.toml and additional virtual files", () => {
    const artifact = createGeneratedArtifactStub({
      moveToml: "[package]\nname = \"starter_contract\"\n",
      sourceFiles: [
        { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
        { path: "Move.lock", content: "[move]\nversion = 4\n" },
      ],
    });

    render(
      <MoveSourcePanel
        sourceCode={artifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "/Move.toml" }));
    expect(screen.getByLabelText("Move.toml contents").textContent).toContain("name = \"starter_contract\"");

    fireEvent.click(screen.getByRole("tab", { name: "/Move.lock" }));
    expect(screen.getByLabelText("Move.lock contents").textContent).toContain("version = 4");
  });

  it("shows an empty state when no source is available", () => {
    render(<MoveSourcePanel sourceCode={null} status={{ state: "error", diagnostics: [] }} />);

    expect(screen.getByText("No generated Move source yet")).toBeVisible();
    expect(screen.getByText(/Resolve graph validation issues or compile errors/)).toBeVisible();
  });

  it("renders build output alongside source code when diagnostics are available", () => {
    const rawBuildOutput = [
      "error[E04023]: invalid method call",
      "   ┌─ ./dependencies/world/sources/access/access_control.move:113:2",
      "   │",
      "113 │ │ cap_type.datatype_string() == std::ascii::string(b\"character\")",
    ].join("\n");
    const artifact = createGeneratedArtifactStub({
      diagnostics: [{
        severity: "error",
        stage: "compilation",
        rawMessage: rawBuildOutput,
        line: 113,
        reactFlowNodeId: null,
        socketId: null,
        userMessage: "invalid method call",
      }],
    });

    render(
      <MoveSourcePanel
        sourceCode={artifact.moveSource}
        status={{ state: "error", diagnostics: artifact.diagnostics ?? [], artifact }}
      />,
    );

    expect(screen.getByLabelText(`${artifact.sourceFilePath} contents`).textContent).toBe(artifact.moveSource);
    expect(screen.getByRole("region", { name: "Build output" })).toBeVisible();
    expect(screen.getByLabelText("Build output contents").textContent).toContain(rawBuildOutput);
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

  it("does not render deployment metadata in the Move tab", () => {
    const { container } = render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(container.querySelector(".ff-move-source__meta")).toBeNull();
    expect(screen.queryByText("Provide the target turret package and extension registration details to continue deployment.")).not.toBeInTheDocument();
    expect(screen.queryAllByText("Compiled")).toHaveLength(0);
  });

  it("does not surface deployment metadata for successful deployments in the Move tab", () => {
    const artifact = createGeneratedArtifactStub({
      deploymentStatus: createDeploymentStatus("deployed", {
        targetId: "testnet:stillness",
        packageId: "0xabc123",
        confirmationReference: "0xdigest123",
        nextActionSummary: "Deployment completed for testnet:stillness. Package ID: 0xabc123.",
      }),
    });

    render(
      <MoveSourcePanel
        sourceCode={artifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact }}
      />,
    );

    expect(screen.queryByText("testnet:stillness")).not.toBeInTheDocument();
    expect(screen.queryByText("0xabc123")).not.toBeInTheDocument();
    expect(screen.queryByText("0xdigest123")).not.toBeInTheDocument();
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

  it("invokes rebuild when the Move tab rebuild button is pressed", () => {
    const handleRebuild = vi.fn();

    render(
      <MoveSourcePanel
        onRebuild={handleRebuild}
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rebuild" }));

    expect(handleRebuild).toHaveBeenCalledTimes(1);
  });

  it("shows rebuilding feedback while compilation is in progress", () => {
    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiling" }}
      />,
    );

    expect(screen.getByRole("button", { name: "Rebuilding..." })).toBeDisabled();
  });

  it("copies generated source and updates the action label", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(compiledArtifact.moveSource);
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("copies the selected virtual file contents", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    render(
      <MoveSourcePanel
        sourceCode={compiledArtifact.moveSource}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "/Move.toml" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(compiledArtifact.moveToml);
    });
  });
});