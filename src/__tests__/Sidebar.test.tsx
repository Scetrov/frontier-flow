import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Sidebar from "../components/Sidebar";
import { nodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";

const singleCategoryDefinitions: readonly NodeDefinition[] = [
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

const twoCategoryDefinitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Trigger combat automations.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [],
  },
  {
    type: "hpRatio",
    label: "HP Ratio",
    description: "Returns the health ratio.",
    color: "var(--socket-value)",
    category: "data-accessor",
    sockets: [],
  },
];

describe("Sidebar", () => {
  it("renders all five category headings", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Event Trigger",
      "Data Accessor",
      "Logic Gate",
      "Data Source",
      "Action",
    ]);
  });

  it("expands only the first category on initial load", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    const toolbox = screen.getByRole("complementary", { name: "Node toolbox" });

    expect(within(toolbox).getByRole("button", { name: "Event Trigger category" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    for (const label of ["Data Accessor", "Logic Gate", "Data Source", "Action"]) {
      expect(within(toolbox).getByRole("button", { name: `${label} category` })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  it("shows first-category node buttons and hides collapsed-category node buttons on load", () => {
    render(<Sidebar definitions={nodeDefinitions} />);
    const toolbox = screen.getByRole("complementary", { name: "Node toolbox" });

    // event-trigger nodes visible (expanded by default)
    expect(within(toolbox).getByRole("button", { name: /Aggression/ })).toBeInTheDocument();
    expect(within(toolbox).getByRole("button", { name: /Proximity/ })).toBeInTheDocument();

    // action node not in DOM (collapsed)
    expect(within(toolbox).queryByRole("button", { name: /Add to Queue/ })).not.toBeInTheDocument();
  });

  it("expands a collapsed category when its header is clicked", () => {
    render(<Sidebar definitions={twoCategoryDefinitions} />);

    expect(screen.queryByRole("button", { name: /HP Ratio/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Data Accessor category" }));

    expect(screen.getByRole("button", { name: /HP Ratio/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Data Accessor category" })).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses an expanded category when its header is clicked", () => {
    render(<Sidebar definitions={twoCategoryDefinitions} />);

    expect(screen.getByRole("button", { name: /Aggression/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Event Trigger category" }));

    expect(screen.queryByRole("button", { name: /Aggression/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Event Trigger category" })).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the empty state when there are no definitions", () => {
    render(<Sidebar definitions={[]} />);

    expect(screen.getByText("No node definitions available.")).toBeVisible();
  });

  it("does not render the deprecated toolbox footer summary", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    expect(screen.queryByText(`${String(nodeDefinitions.length)} nodes · drag to canvas`)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Header and footer stay pinned while the catalogue scrolls. Config sources now pair with reusable list accessors.",
      ),
    ).not.toBeInTheDocument();
  });

  it("writes drag metadata including grab offset when a node drag starts", () => {
    render(<Sidebar definitions={singleCategoryDefinitions} />);

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
    expect(setData).toHaveBeenCalledWith("application/x-offset", expect.stringMatching(/^\d+,\d+$/));
  });
});