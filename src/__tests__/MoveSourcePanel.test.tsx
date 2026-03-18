import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MoveSourcePanel from "../components/MoveSourcePanel";

const compiledArtifact = {
  moduleName: "starter_contract",
  sourceFilePath: "sources/starter_contract.move",
  moveToml: "[package]\nname = \"starter_contract\"\n",
  moveSource: "module builder_extensions::starter_contract {}",
  sourceMap: [],
  dependencies: [],
  bytecodeModules: [],
} as const;

describe("MoveSourcePanel", () => {
  it("renders highlighted read-only Move source when code is available", () => {
    render(
      <MoveSourcePanel
        sourceCode={`module builder_extensions::starter_contract {
    public fun execute() {
        let compiled = true;
    }
}`}
        status={{ state: "compiled", bytecode: [new Uint8Array([1])], artifact: compiledArtifact }}
      />,
    );

    expect(screen.getByLabelText("Move source view")).toBeInTheDocument();
    expect(screen.getByText("Generated source")).toBeVisible();
    expect(screen.getByText(/module builder_extensions::starter_contract/)).toBeVisible();
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
});