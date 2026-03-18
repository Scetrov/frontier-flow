import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";

import type { CompilationStatus, CompilerDiagnostic } from "../compiler/types";

interface CanvasWorkspaceProps {
  readonly onCompilationStateChange?: (
    status: CompilationStatus,
    diagnostics: readonly CompilerDiagnostic[],
    sourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
}

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

const moveSourcePanelSpy = vi.fn<(props: MoveSourcePanelProps) => void>();
let lastMoveSourcePanelProps: MoveSourcePanelProps | null = null;
let hasReportedCompilation = false;

vi.mock("../components/Header", () => ({
  default: () => <div>Header Slot</div>,
}));

vi.mock("../components/Footer", () => ({
  default: () => <div>Footer Slot</div>,
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar Slot</div>,
}));

vi.mock("../components/KitchenSinkPage", () => ({
  default: () => <div>Kitchen Sink Slot</div>,
}));

vi.mock("../components/CanvasWorkspace", () => ({
  default: ({ onCompilationStateChange }: CanvasWorkspaceProps) => {
    if (!hasReportedCompilation) {
      hasReportedCompilation = true;
      queueMicrotask(() => {
        onCompilationStateChange?.(
          {
            state: "compiled",
            bytecode: [new Uint8Array([1, 2, 3])],
            artifact: {
              moduleName: "artifact_contract",
              sourceFilePath: "sources/artifact_contract.move",
              moveToml: "[package]",
              moveSource: "module builder_extensions::artifact_contract {}",
              sourceMap: [],
              dependencies: [],
              bytecodeModules: [new Uint8Array([1, 2, 3])],
            },
          },
          [],
          null,
          "module builder_extensions::artifact_contract {}",
        );
      });
    }

    return <div>Canvas Workspace Slot</div>;
  },
}));

vi.mock("../components/MoveSourcePanel", () => ({
  default: (props: MoveSourcePanelProps) => {
    lastMoveSourcePanelProps = props;
    moveSourcePanelSpy(props);
    return <div>Move Source Slot</div>;
  },
}));

describe("App compilation handoff", () => {
  afterEach(() => {
    moveSourcePanelSpy.mockClear();
    lastMoveSourcePanelProps = null;
    hasReportedCompilation = false;
    window.history.replaceState({}, "", "/");
  });

  it("prefers artifact-backed Move source when the workspace reports it", () => {
    render(<App />);

    return waitFor(() => {
      expect(moveSourcePanelSpy).toHaveBeenCalled();
      expect(lastMoveSourcePanelProps).not.toBeNull();
      expect(lastMoveSourcePanelProps?.sourceCode).toBe("module builder_extensions::artifact_contract {}");
      expect(lastMoveSourcePanelProps?.status.state).toBe("compiled");
    });
  });
});