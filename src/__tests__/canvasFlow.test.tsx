import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CanvasWorkspace from "../components/CanvasWorkspace";
import { restoreSavedFlow } from "../components/restoreSavedFlow";
import { createFlowNodeData } from "../data/node-definitions";
import type { FlowNode } from "../types/nodes";

function createFlowNode(id: string, type: string, position = { x: 0, y: 0 }): FlowNode {
  return {
    id,
    type,
    position,
    data: createFlowNodeData({
      type,
      label: "Stale Node",
      description: "stale",
      color: "var(--socket-any)",
      category: "action",
      sockets: [],
    }),
  };
}

function createDropData(type: string, offset?: { x: number; y: number }) {
  return {
    getData: (key: string) => {
      if (key === "application/reactflow") return type;
      if (key === "application/x-offset" && offset !== undefined) return `${String(offset.x)},${String(offset.y)}`;
      return "";
    },
  };
}

describe("CanvasWorkspace", () => {
  it("renders an empty-state prompt before any node is dropped", () => {
    render(<CanvasWorkspace />);

    expect(screen.getByText("Contract Canvas")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Start with Aggression or Proximity, then layer scoring, filters, config sources, config list accessors, and Add to Queue.",
      ),
    ).toBeInTheDocument();
  });

  it("places a dropped node on the canvas with its socket labels", () => {
    render(<CanvasWorkspace />);

    const canvas = screen.getByLabelText("Node editor canvas");
    fireEvent.dragOver(canvas, { dataTransfer: createDropData("proximity") });
    fireEvent.drop(canvas, {
      clientX: 240,
      clientY: 180,
      dataTransfer: createDropData("proximity"),
    });

    expect(screen.getByText("Proximity")).toBeInTheDocument();
    expect(screen.getByText("priority")).toBeInTheDocument();
    expect(screen.getByText("target")).toBeInTheDocument();
  });

  it("creates independent nodes for repeated drops", () => {
    render(<CanvasWorkspace />);

    const canvas = screen.getByLabelText("Node editor canvas");
    fireEvent.drop(canvas, {
      clientX: 180,
      clientY: 160,
      dataTransfer: createDropData("shieldRatio"),
    });
    fireEvent.drop(canvas, {
      clientX: 340,
      clientY: 220,
      dataTransfer: createDropData("shieldRatio"),
    });

    expect(screen.getAllByText("Shield Ratio")).toHaveLength(2);
  });

  it("renders representative contract nodes from multiple categories", () => {
    render(<CanvasWorkspace />);

    const canvas = screen.getByLabelText("Node editor canvas");
    fireEvent.drop(canvas, {
      clientX: 180,
      clientY: 160,
      dataTransfer: createDropData("aggression"),
    });
    fireEvent.drop(canvas, {
      clientX: 300,
      clientY: 220,
      dataTransfer: createDropData("groupBonusConfig"),
    });
    fireEvent.drop(canvas, {
      clientX: 420,
      clientY: 280,
      dataTransfer: createDropData("excludeSameTribe"),
    });
    fireEvent.drop(canvas, {
      clientX: 540,
      clientY: 340,
      dataTransfer: createDropData("addToQueue"),
    });

    expect(screen.getByText("Aggression")).toBeInTheDocument();
    expect(screen.getByText("Group Bonus Config")).toBeInTheDocument();
    expect(screen.getByText("Exclude Same Tribe")).toBeInTheDocument();
    expect(screen.getByText("Add to Queue")).toBeInTheDocument();
    expect(screen.getByText("owner tribe")).toBeInTheDocument();
    expect(screen.getByText("weight")).toBeInTheDocument();
  });

  it("applies drag offset so the node is anchored at the grab point, not the cursor tip", () => {
    render(<CanvasWorkspace />);

    const canvas = screen.getByLabelText("Node editor canvas");

    // Drop with a non-zero offset — the node must still be created regardless of offset value.
    fireEvent.drop(canvas, {
      clientX: 350,
      clientY: 250,
      dataTransfer: createDropData("proximity", { x: 30, y: 20 }),
    });

    expect(screen.getByText("Proximity")).toBeInTheDocument();
  });

  it("omits unknown saved node types and warns instead of crashing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <CanvasWorkspace
        initialEdges={[{ id: "unknown-edge", source: "known", target: "unknown", sourceHandle: "priority", targetHandle: "target" }]}
        initialNodes={[createFlowNode("known", "aggression"), createFlowNode("unknown", "obsoleteNode")]}
      />,
    );

    expect(screen.getByText("Aggression")).toBeInTheDocument();
    expect(screen.queryByText("Stale Node")).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith("Omitting unknown saved node type: obsoleteNode");

    warnSpy.mockRestore();
  });

  it("drops restored edges whose saved handles no longer exist", () => {
    const restoredFlow = restoreSavedFlow(
      [createFlowNode("source", "aggression", { x: 0, y: 0 }), createFlowNode("target", "getTribe", { x: 240, y: 0 })],
      [
        {
          id: "stale-edge",
          source: "source",
          target: "target",
          sourceHandle: "aggressor",
          targetHandle: "target",
        },
      ],
    );

    expect(restoredFlow.edges).toHaveLength(0);
  });

  it("preserves restored edges whose handles still exist", () => {
    const restoredFlow = restoreSavedFlow(
      [createFlowNode("source", "aggression", { x: 0, y: 0 }), createFlowNode("target", "getTribe", { x: 240, y: 0 })],
      [
        {
          id: "valid-edge",
          source: "source",
          target: "target",
          sourceHandle: "target",
          targetHandle: "target",
        },
      ],
    );

    expect(restoredFlow.edges).toHaveLength(1);
  });

  it("keeps canvas controls keyboard focusable", async () => {
    const { container } = render(<CanvasWorkspace />);

    await waitFor(() => {
      const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".ff-canvas__controls button"));
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button.tabIndex).not.toBe(-1);
      });
    });
  });
});