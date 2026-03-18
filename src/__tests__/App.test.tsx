import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import { createDefaultContractFlow } from "../data/kitchenSinkFlow";

interface CanvasWorkspaceSpyProps {
  readonly initialNodes?: unknown;
  readonly initialEdges?: unknown;
  readonly initialContractName?: string;
  readonly focusedDiagnosticNodeId?: string | null;
  readonly focusedDiagnosticRequestKey?: number;
}

const canvasWorkspaceSpy = vi.fn<(props: CanvasWorkspaceSpyProps) => void>();
const footerSpy = vi.fn();

vi.mock("../components/Header", () => ({
  default: () => <div>Header Slot</div>,
}));

vi.mock("../components/Footer", () => ({
  default: (props: { onSelectDiagnostic?: (nodeId: string) => void }) => {
    footerSpy(props);
    return (
      <button
        type="button"
        onClick={() => {
          props.onSelectDiagnostic?.("node_1");
        }}
      >
        Footer Slot
      </button>
    );
  },
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar Slot</div>,
}));

vi.mock("../components/CanvasWorkspace", () => ({
  default: (props: CanvasWorkspaceSpyProps) => {
    canvasWorkspaceSpy(props);
    return <div>Canvas Workspace Slot</div>;
  },
}));

vi.mock("../components/KitchenSinkPage", () => ({
  default: () => <div>Kitchen Sink Slot</div>,
}));

vi.mock("../components/MoveSourcePanel", () => ({
  default: () => <div>Move Source Slot</div>,
}));

describe("App", () => {
  const defaultContractFlow = createDefaultContractFlow();

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    canvasWorkspaceSpy.mockClear();
    footerSpy.mockClear();
  });

  it("renders the default editor shell on the root route", () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    expect(screen.getByLabelText("Application shell")).toBeInTheDocument();
    expect(screen.getByText("Canvas Workspace Slot")).toBeInTheDocument();
    expect(screen.getByText("Sidebar Slot")).toBeInTheDocument();
    expect(screen.queryByText("Kitchen Sink Slot")).not.toBeInTheDocument();
    expect(canvasWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContractName: "Starter Contract",
        initialNodes: defaultContractFlow.nodes,
        initialEdges: defaultContractFlow.edges,
      }),
    );
  });

  it("renders the kitchen sink page on the /kitchen-sink route", () => {
    window.history.replaceState({}, "", "/kitchen-sink");

    render(<App />);

    expect(screen.getByText("Kitchen Sink Slot")).toBeInTheDocument();
    expect(screen.queryByLabelText("Application shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Sidebar Slot")).not.toBeInTheDocument();
  });

  it("reissues diagnostic focus requests when the same item is selected repeatedly", () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Footer Slot" }));
    const firstRequest = canvasWorkspaceSpy.mock.lastCall?.[0];

    fireEvent.click(screen.getByRole("button", { name: "Footer Slot" }));
    const secondRequest = canvasWorkspaceSpy.mock.lastCall?.[0];

    expect(firstRequest).toEqual(
      expect.objectContaining({
        focusedDiagnosticNodeId: "node_1",
        focusedDiagnosticRequestKey: 1,
      }),
    );
    expect(secondRequest).toEqual(
      expect.objectContaining({
        focusedDiagnosticNodeId: "node_1",
        focusedDiagnosticRequestKey: 2,
      }),
    );
  });
});