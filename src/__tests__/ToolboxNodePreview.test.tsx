import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ToolboxNodePreview from "../components/ToolboxNodePreview";
import { authorableNodeDefinitions } from "../data/node-definitions";

describe("ToolboxNodePreview", () => {
  it.each(authorableNodeDefinitions)("renders a shared preview for $label", (definition) => {
    const onDragStart = vi.fn();
    const { container } = render(<ToolboxNodePreview definition={definition} onDragStart={onDragStart} />);

    const preview = screen.getByRole("button", { name: definition.label });

    expect(preview).not.toBeNull();
    expect(preview).toHaveAttribute("draggable", "true");
    expect(preview).toHaveAttribute("type", "button");
    expect(screen.getByText(definition.label)).toBeInTheDocument();
    expect(screen.getByText(definition.description)).toBeInTheDocument();
    expect(container.querySelectorAll(".ff-node__handle-indicator")).toHaveLength(definition.sockets.length);
    expect(container.querySelector(".react-flow__handle")).toBeNull();
    expect(container.querySelector(".ff-node__edit-button")).toBeNull();
    expect(container.querySelector(".ff-node__delete-button")).toBeNull();
  });

  it("forwards drag start metadata through the preview root", () => {
    const onDragStart = vi.fn();
    const definition = authorableNodeDefinitions[0];

    render(<ToolboxNodePreview definition={definition} onDragStart={onDragStart} />);

    fireEvent.dragStart(screen.getByRole("button", { name: definition.label }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragStart.mock.calls[0]?.[1]).toEqual(definition);
  });
});