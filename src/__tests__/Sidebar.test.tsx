import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Sidebar from "../components/Sidebar";
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
  it("renders node definitions", () => {
    render(<Sidebar definitions={definitions} />);

    expect(screen.getByRole("complementary", { name: "Node toolbox" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aggression/ })).toBeInTheDocument();
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