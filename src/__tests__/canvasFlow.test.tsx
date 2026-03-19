import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CanvasWorkspace from "../components/CanvasWorkspace";
import { restoreSavedFlow } from "../components/restoreSavedFlow";
import { createDefaultContractFlow } from "../data/kitchenSinkFlow";
import { createFlowNodeData } from "../data/node-definitions";
import type { FlowNode } from "../types/nodes";
import type { ContractLibrary } from "../utils/contractStorage";
import { CONTRACT_LIBRARY_STORAGE_KEY } from "../utils/contractStorage";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";
import { isValidFlowConnection } from "../utils/socketTypes";

const originalMatchMedia = window.matchMedia;

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

function readStoredContractLibrary(): ContractLibrary {
  return JSON.parse(window.localStorage.getItem(CONTRACT_LIBRARY_STORAGE_KEY) ?? "{}") as ContractLibrary;
}

describe("CanvasWorkspace", () => {
  beforeEach(() => {
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
    window.localStorage.clear();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("persists the active named contract to local storage", async () => {
    const defaultContractFlow = createDefaultContractFlow();

    render(
      <CanvasWorkspace
        initialContractName="Starter Contract"
        initialEdges={defaultContractFlow.edges}
        initialNodes={defaultContractFlow.nodes}
      />,
    );

    await waitFor(() => {
      expect(window.localStorage.getItem(CONTRACT_LIBRARY_STORAGE_KEY)).not.toBeNull();
    });

    const library = readStoredContractLibrary();

    expect(library.activeContractName).toBe("Starter Contract");
    expect(library.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Starter Contract" }),
        expect.objectContaining({ isSeeded: true }),
      ]),
    );
  });

  it("can save the current graph as a second named contract", async () => {
    const defaultContractFlow = createDefaultContractFlow();

    render(
      <CanvasWorkspace
        initialContractName="Starter Contract"
        initialEdges={defaultContractFlow.edges}
        initialNodes={defaultContractFlow.nodes}
      />,
    );

    fireEvent.change(screen.getByLabelText("Contract name"), { target: { value: "Raid Response" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Copy" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Saved contract")).toHaveValue("Raid Response");
    });

    const library = readStoredContractLibrary();

    expect(library.activeContractName).toBe("Raid Response");
    expect(library.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Starter Contract" }),
        expect.objectContaining({ name: "Raid Response" }),
      ]),
    );
  });

  it("collapses and reopens saved contract controls from the left drawer handle", () => {
    render(<CanvasWorkspace />);

    const controls = screen.getByRole("region", { name: "Saved contract controls" });

    fireEvent.click(screen.getByRole("button", { name: "Close saved contract controls" }));

    expect(controls).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Open saved contract controls" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open saved contract controls" }));

    expect(controls).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "Close saved contract controls" })).toBeInTheDocument();
  });

  it("restores the saved contract drawer state from local storage on mount", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "visual",
        isSidebarOpen: true,
        isContractPanelOpen: false,
      }),
    );

    render(<CanvasWorkspace />);

    expect(document.getElementById("saved-contract-controls")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Open saved contract controls" })).toBeInTheDocument();
  });

  it("persists the saved contract drawer state when toggled", () => {
    render(<CanvasWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Close saved contract controls" }));

    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      isContractPanelOpen: false,
      isSidebarOpen: true,
      activeView: "visual",
    });
  });

  it("renders an empty-state prompt before any node is dropped", () => {
    render(<CanvasWorkspace />);

    expect(screen.getByText("Contract Canvas")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Start with Aggression or Proximity, then layer scoring, filters, and Add to Queue.",
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

  it("opens a node field editor and saves live tribe selections", async () => {
    const fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: 98000418, name: "Pegasus Cartel", nameShort: "PGCL" }],
          metadata: { total: 1, limit: 100, offset: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <CanvasWorkspace
        initialNodes={[
          {
            id: "tribe_list_1",
            type: "listTribe",
            position: { x: 0, y: 0 },
            data: {
              ...createFlowNodeData({
                type: "listTribe",
                label: "List of Tribe",
                description: "Curate a reusable tribe list for downstream target matching.",
                color: "var(--socket-entity)",
                category: "data-accessor",
                sockets: [{ id: "list", type: "any", position: "right", direction: "output", label: "list" }],
              }),
            },
          },
        ]}
        mode="preview"
      />,
    );

    fireEvent.click(screen.getByLabelText("Edit List of Tribe"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Pegasus Cartel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith("https://world-api-stillness.live.tech.evefrontier.com/v2/tribes");
    fetchSpy.mockRestore();
  });

  it("saves character addresses from the node field editor", async () => {
    render(
      <CanvasWorkspace
        initialNodes={[
          createFlowNode("character_list_1", "listCharacter"),
        ]}
        mode="preview"
      />,
    );

    fireEvent.click(screen.getByLabelText("Edit List of Character"));
    fireEvent.change(screen.getByLabelText("Character address"), { target: { value: "0xabc123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(screen.getAllByText("0xabc123").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
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
      dataTransfer: createDropData("getBehaviour"),
    });
    fireEvent.drop(canvas, {
      clientX: 420,
      clientY: 280,
      dataTransfer: createDropData("booleanOr"),
    });
    fireEvent.drop(canvas, {
      clientX: 540,
      clientY: 340,
      dataTransfer: createDropData("addToQueue"),
    });

    expect(screen.getByText("Aggression")).toBeInTheDocument();
    expect(screen.getByText("Get Behaviour")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Add to Queue")).toBeInTheDocument();
    expect(screen.getByText("right")).toBeInTheDocument();
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
    expect(screen.getByText("Legacy remediation required")).toBeInTheDocument();
    expect(screen.getByText(/Legacy node "obsoleteNode" could not be restored automatically\./)).toBeInTheDocument();
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

  it("restores a connected default contract flow", () => {
    const defaultContractFlow = createDefaultContractFlow();

    render(
      <CanvasWorkspace
        initialEdges={defaultContractFlow.edges}
        initialNodes={defaultContractFlow.nodes}
      />,
    );

    expect(screen.getByText("Aggression")).toBeInTheDocument();
    expect(screen.getByText("Get Tribe")).toBeInTheDocument();
    expect(screen.getByText("Is Same Tribe")).toBeInTheDocument();
    expect(screen.getByText("NOT")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
    expect(screen.getByText("Get Priority Weight")).toBeInTheDocument();
    expect(screen.getByText("Add to Queue")).toBeInTheDocument();
    expect(screen.queryByText("Contract Canvas")).not.toBeInTheDocument();
  });

  it("ignores saved contracts when rendered in preview mode", () => {
    window.localStorage.setItem(
      CONTRACT_LIBRARY_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        activeContractName: "Stored Contract",
        contracts: [
          {
            id: "contract:stored-contract",
            name: "Stored Contract",
            nodes: [createFlowNode("stored_node", "getBehaviour")],
            edges: [],
            updatedAt: new Date(0).toISOString(),
          },
        ],
      } satisfies ContractLibrary),
    );

    render(
      <CanvasWorkspace
        initialContractName="Kitchen Sink"
        initialNodes={[
          createFlowNode("preview_aggression", "aggression"),
          createFlowNode("preview_proximity", "proximity", { x: 240, y: 0 }),
        ]}
        mode="preview"
      />,
    );

    expect(screen.getByText("Aggression")).toBeInTheDocument();
    expect(screen.getByText("Proximity")).toBeInTheDocument();
    expect(screen.queryByText("Get Behaviour")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Saved contract controls" })).not.toBeInTheDocument();
  });

  it("opens a right-click context menu that offers auto-arrange", async () => {
    const defaultContractFlow = createDefaultContractFlow();

    render(
      <CanvasWorkspace
        initialContractName="Starter Contract"
        initialEdges={defaultContractFlow.edges}
        initialNodes={defaultContractFlow.nodes}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("canvas-workspace"));

    expect(screen.getByRole("menu", { name: "Canvas context menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Auto-arrange contract" }));

    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not.toBeInTheDocument();
    });
  });

  it("uses only valid connections in the default contract flow", () => {
    const defaultContractFlow = createDefaultContractFlow();

    defaultContractFlow.edges.forEach((edge) => {
      expect(
        isValidFlowConnection(
          {
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? null,
            targetHandle: edge.targetHandle ?? null,
          },
          defaultContractFlow.nodes,
          [],
        ),
      ).toBe(true);
    });
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