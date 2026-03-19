import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Footer from "../components/Footer";

describe("Footer", () => {
  it("renders version information, repository link, and idle compilation status", () => {
    render(<Footer />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeVisible();
    expect(screen.getByText("Idle")).toBeVisible();
    expect(screen.getByRole("link", { name: "Source Repository" })).toHaveAttribute(
      "href",
      "https://github.com/Scetrov/frontier-flow",
    );
  });

  it("surfaces artifact-linked diagnostics through the footer status panel", () => {
    const onSelectDiagnostic = vi.fn();

    render(
      <Footer
        diagnostics={[
          {
            severity: "error",
            stage: "compilation",
            rawMessage: "error[E03001]: unresolved symbol",
            line: 10,
            reactFlowNodeId: "queue_1",
            socketId: null,
            userMessage: "Generated artifact failed to compile.",
          },
        ]}
        onSelectDiagnostic={onSelectDiagnostic}
        status={{
          state: "error",
          diagnostics: [],
          artifact: {
            moduleName: "starter_contract",
            sourceFilePath: "sources/starter_contract.move",
            moveToml: "[package]",
            moveSource: "module builder_extensions::starter_contract {}",
            sourceMap: [],
            dependencies: [],
            bytecodeModules: [],
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Error" }));
    fireEvent.click(screen.getByRole("button", { name: "Generated artifact failed to compile." }));

    expect(onSelectDiagnostic).toHaveBeenCalledWith("queue_1");
  });
});