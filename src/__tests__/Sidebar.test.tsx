import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Sidebar from "../components/Sidebar";
import { nodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";

const definitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Trigger combat automations.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [
      {
        id: "priority",
        type: "priority",
        position: "right",
        direction: "output",
        label: "priority",
      },
    ],
  },
];

describe("Sidebar", () => {
  it("renders the contract-aligned palette grouped by category", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    const toolbox = screen.getByRole("complementary", { name: "Node toolbox" });
    expect(toolbox).toBeInTheDocument();

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Event Trigger",
      "Data Accessor",
      "Logic Gate",
      "Data Source",
      "Action",
    ]);

    expect(within(toolbox).getAllByRole("button")).toHaveLength(29);
    expect(within(toolbox).getByRole("button", { name: /Aggression/ })).toBeInTheDocument();
    expect(within(toolbox).getByRole("button", { name: /Add to Queue/ })).toBeInTheDocument();
  });

  it("shows the empty state when there are no definitions", () => {
    render(<Sidebar definitions={[]} />);

    expect(screen.getByText("No node definitions available.")).toBeVisible();
  });

  it("writes drag metadata when a node drag starts", () => {
    render(<Sidebar definitions={definitions} />);

    const setData = vi.fn();
    const button = screen.getByRole("button", { name: /Aggression/ });

    fireEvent.dragStart(button, {
      dataTransfer: {
        effectAllowed: "uninitialized",
        setData,
      },
    });

    expect(setData).toHaveBeenCalledWith("application/reactflow", "aggression");
    expect(setData).toHaveBeenCalledWith("application/label", "Aggression");
  });
});