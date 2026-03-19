import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";

import BaseNode from "../nodes/BaseNode";
import { createFlowNodeData } from "../data/node-definitions";
import type { FlowNodeData } from "../types/nodes";

/** Minimal props wrapper for BaseNode (which expects to live inside a ReactFlowProvider). */
function renderBaseNode(
  definitionOverrides?: Partial<Parameters<typeof createFlowNodeData>[0]>,
  dataOverrides?: Partial<FlowNodeData>,
) {
  const definition = {
    type: "proximity",
    label: "Proximity",
    description: "Nearest hostile target.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [],
    ...definitionOverrides,
  } as const;

  const data = { ...createFlowNodeData(definition), ...dataOverrides };

  return render(
    <ReactFlowProvider>
      {/* @ts-expect-error — minimal NodeProps stub for test purposes */}
      <BaseNode data={data} id="test-node" selected={false} />
    </ReactFlowProvider>,
  );
}

function renderSelectedBaseNode(overrides?: Partial<Parameters<typeof createFlowNodeData>[0]>) {
  const definition = {
    type: "proximity",
    label: "Proximity",
    description: "Nearest hostile target.",
    color: "var(--socket-value)",
    category: "event-trigger",
    sockets: [],
    ...overrides,
  } as const;

  const data = createFlowNodeData(definition);

  return render(
    <ReactFlowProvider>
      {/* @ts-expect-error — minimal NodeProps stub for test purposes */}
      <BaseNode data={data} id="test-node" selected={true} />
    </ReactFlowProvider>,
  );
}

describe("BaseNode", () => {
  it("renders the node title in the coloured header", () => {
    renderBaseNode();
    expect(screen.getByText("Proximity")).toBeInTheDocument();
  });

  it("renders the description below the header, outside the socket grid", () => {
    renderBaseNode({ description: "Nearest hostile target." });

    const description = screen.getByText("Nearest hostile target.");
    expect(description).toBeInTheDocument();

    // The description element must NOT be inside the body (socket grid) element.
    const body = description.closest(".ff-node__body");
    expect(body).toBeNull();

    // It must be inside the node surface.
    const surface = description.closest(".ff-node__surface");
    expect(surface).not.toBeNull();
  });

  it("does not render the top spacer row when there are no top sockets", () => {
    const { container } = renderBaseNode({ sockets: [] });
    expect(container.querySelector(".ff-node__row--top")).toBeNull();
  });

  it("does not render the bottom spacer row when there are no bottom sockets", () => {
    const { container } = renderBaseNode({ sockets: [] });
    expect(container.querySelector(".ff-node__row--bottom")).toBeNull();
  });

  it("renders the top row only when top sockets are present", () => {
    const { container } = renderBaseNode({
      sockets: [
        {
          id: "s1",
          type: "any",
          position: "top",
          direction: "input",
          label: "trigger",
        },
      ],
    });

    expect(container.querySelector(".ff-node__row--top")).not.toBeNull();
    expect(screen.getByText("trigger")).toBeInTheDocument();
  });

  it("renders socket labels in left/right columns", () => {
    renderBaseNode({
      sockets: [
        { id: "in", type: "number", position: "left", direction: "input", label: "input val" },
        { id: "out", type: "number", position: "right", direction: "output", label: "output val" },
      ],
    });

    expect(screen.getByText("input val")).toBeInTheDocument();
    expect(screen.getByText("output val")).toBeInTheDocument();
  });

  it("uses the header accent color for the selected border highlight", () => {
    const { container } = renderSelectedBaseNode({ color: "var(--socket-value)" });

    expect(container.firstElementChild).toHaveStyle({ "--ff-node-accent": "var(--socket-value)" });
  });

  it("renders deprecation copy from the node status", () => {
    renderBaseNode({
      deprecation: {
        status: "deprecated",
        reason: "Use Is Same Tribe for future-safe matching.",
        remediationMessage: "Replace this node before publishing the contract.",
      },
    });

    expect(
      screen.getByText("Deprecated node. Use Is Same Tribe for future-safe matching. Replace this node before publishing the contract."),
    ).toBeInTheDocument();
  });

  it("requests delete confirmation on standard click and immediate delete on shift-click", () => {
    const onDeleteRequest = vi.fn();

    renderBaseNode(undefined, { onDeleteRequest });

    fireEvent.click(screen.getByRole("button", { name: "Delete Proximity" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Proximity" }), { shiftKey: true });

    expect(onDeleteRequest).toHaveBeenNthCalledWith(1, { immediate: false });
    expect(onDeleteRequest).toHaveBeenNthCalledWith(2, { immediate: true });
  });

  it("renders confirm and cancel delete actions while a node is awaiting confirmation", () => {
    const onDeleteConfirm = vi.fn();
    const onDeleteCancel = vi.fn();

    renderBaseNode(undefined, {
      deleteConfirmationState: { mode: "confirm", startedAt: 1 },
      onDeleteCancel,
      onDeleteConfirm,
      onDeleteRequest: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Proximity" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel delete Proximity" }));

    expect(screen.getByRole("button", { name: "Confirm delete Proximity" })).toHaveFocus();
    expect(onDeleteConfirm).toHaveBeenCalledTimes(1);
    expect(onDeleteCancel).toHaveBeenCalledTimes(1);
  });

  it("replaces the main icon with a warning control and diagnostic tooltip for error nodes", () => {
    renderBaseNode(undefined, {
      diagnosticMessages: ["Queue target is missing a predicate."],
      validationState: "error",
    });

    const warningButton = screen.getByRole("button", { name: "Show errors for Proximity" });

    fireEvent.focus(warningButton);
    expect(warningButton).toHaveAttribute("aria-describedby", "test-node-diagnostics");
    expect(warningButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Queue target is missing a predicate.");
  });
});
