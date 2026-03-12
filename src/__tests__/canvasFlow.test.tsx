import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CanvasWorkspace from "../components/CanvasWorkspace";

function createDropData(type: string) {
  return {
    getData: (key: string) => (key === "application/reactflow" ? type : ""),
  };
}

describe("CanvasWorkspace", () => {
  it("renders an empty-state prompt before any node is dropped", () => {
    render(<CanvasWorkspace />);

    expect(screen.getByText("Contract Canvas")).toBeInTheDocument();
    expect(
      screen.getByText("Drag verified nodes from the toolbox to start a targeting graph."),
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
});