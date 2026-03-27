import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Sidebar from "../components/Sidebar";
import { nodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";

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
    category: "data-extractor",
    sockets: [],
  },
];

const splitDataCategoryDefinitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Trigger combat automations.",
    color: "var(--brand-orange)",
    category: "event-trigger",
    sockets: [],
  },
  {
    type: "listTribe",
    label: "List of Tribe",
    description: "Curate tribe lists.",
    color: "var(--socket-entity)",
    category: "static-data",
    sockets: [],
  },
  {
    type: "hpRatio",
    label: "HP Ratio",
    description: "Returns the health ratio.",
    color: "var(--socket-value)",
    category: "data-extractor",
    sockets: [],
  },
  {
    type: "booleanOr",
    label: "OR",
    description: "Combine boolean inputs.",
    color: "var(--socket-signal)",
    category: "logic-gate",
    sockets: [],
  },
  {
    type: "addToQueue",
    label: "Add to Queue",
    description: "Queue a target.",
    color: "var(--socket-vector)",
    category: "action",
    sockets: [],
  },
];

const originalMatchMedia = window.matchMedia;

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = (query: string) => ({
      matches: query === "(min-width: 768px)",
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders the split top-level category headings in deterministic order", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Event Trigger",
      "Static Data",
      "Data Extractor",
      "Logic",
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

    for (const label of ["Static Data", "Data Extractor", "Logic", "Action"]) {
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
    expect(within(toolbox).getByText("Emit priority and target data when a hostile action is detected.")).toBeInTheDocument();

    // action node not in DOM (collapsed)
    expect(within(toolbox).queryByRole("button", { name: /Add to Queue/ })).not.toBeInTheDocument();
  });

  it("renders toolbox entries with shared node chrome and no edit or delete controls", () => {
    render(<Sidebar definitions={singleCategoryDefinitions} />);

    const preview = screen.getByRole("button", { name: "Aggression" });

    expect(preview.querySelector(".ff-node__surface")).not.toBeNull();
    expect(preview.querySelector(".ff-node__edit-button")).toBeNull();
    expect(preview.querySelector(".ff-node__delete-button")).toBeNull();
    expect(preview.querySelector(".react-flow__handle")).toBeNull();
  });

  it("expands a collapsed category when its header is clicked", () => {
    render(<Sidebar definitions={twoCategoryDefinitions} />);

    expect(screen.queryByRole("button", { name: /HP Ratio/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Data Extractor category" }));

    expect(screen.getByRole("button", { name: /HP Ratio/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Data Extractor category" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps static data and data extractor adjacent between event trigger and logic", () => {
    render(<Sidebar definitions={splitDataCategoryDefinitions} />);

    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Event Trigger",
      "Static Data",
      "Data Extractor",
      "Logic",
      "Action",
    ]);
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

  it("collapses and reopens the toolbox from the chevron handle", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    const toggle = screen.getByRole("button", { name: "Close node toolbox" });
    const toolbox = screen.getByRole("complementary", { name: "Node toolbox" });

    expect(within(toggle).getByText("Toolbox")).toBeInTheDocument();
    expect(toggle).toHaveClass("ff-canvas__drawer-handle");

    fireEvent.click(toggle);

    expect(toolbox).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Open node toolbox" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open node toolbox" }));

    expect(toolbox).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "Close node toolbox" })).toBeInTheDocument();
  });

  it("restores the toolbox state from local storage on mount", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "visual",
        isSidebarOpen: false,
        isContractPanelOpen: true,
      }),
    );

    render(<Sidebar definitions={nodeDefinitions} />);

    expect(document.getElementById("node-toolbox")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Open node toolbox" })).toBeInTheDocument();
  });

  it("persists the toolbox state when toggled", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    fireEvent.click(screen.getByRole("button", { name: "Close node toolbox" }));

    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      isSidebarOpen: false,
      isContractPanelOpen: true,
      activeView: "visual",
    });
  });

  it("does not render the deprecated toolbox footer summary", () => {
    render(<Sidebar definitions={nodeDefinitions} />);

    expect(screen.queryByText(`${String(nodeDefinitions.length)} nodes · drag to canvas`)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Header and footer stay pinned while the catalogue scrolls. Config sources now pair with reusable list accessors.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /themop\.dev/i })).toHaveAttribute("href", "https://themop.dev");
    expect(screen.getByText("Use Ministry of Passage in your gates for jump control.")).toBeInTheDocument();
  });

  it("writes drag metadata including grab offset when a node drag starts", () => {
    render(<Sidebar definitions={singleCategoryDefinitions} />);

    const setData = vi.fn();
    const button = screen.getByRole("button", { name: /^Aggression$/ });

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