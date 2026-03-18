import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CompilationStatus from "../components/CompilationStatus";

describe("CompilationStatus", () => {
  it("renders all primary states", () => {
    const { rerender } = render(<CompilationStatus diagnostics={[]} status={{ state: "idle" }} />);
    expect(screen.getByText("Idle")).toBeVisible();

    rerender(<CompilationStatus diagnostics={[]} status={{ state: "compiling" }} />);
    expect(screen.getByText("Compiling")).toBeVisible();

    rerender(<CompilationStatus diagnostics={[]} status={{ state: "compiled", bytecode: [new Uint8Array([1])] }} />);
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
});