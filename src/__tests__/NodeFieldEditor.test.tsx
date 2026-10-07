import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NodeFieldEditor from "../nodes/NodeFieldEditor";
import { resetNodeFieldEditorOptionCacheForTests } from "../nodes/nodeFieldEditorOptions";

describe("NodeFieldEditor", () => {
  beforeEach(() => {
    resetNodeFieldEditorOptionCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides an accessible dialog name and restores focus on close", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open List Editor";
    document.body.append(trigger);
    trigger.focus();

    const { unmount } = render(
      <NodeFieldEditor
        fields={{ characterAddresses: [] }}
        nodeLabel="List of Character"
        nodeType="listCharacter"
        onClose={() => undefined}
        onSave={() => undefined}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "List of Character" });
    expect(dialog).toHaveAttribute("aria-describedby");
    expect(screen.getByText("Configure node-specific values before saving your changes.")).toBeVisible();

    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });

    unmount();

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });

    trigger.remove();
  });

  it("filters malformed world API options without surfacing a load error", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 98_000_418, name: "Pegasus Cartel", nameShort: "PEG" },
          { id: "bad", name: "Broken Tribe" },
          { id: 98_000_419 },
          null,
        ],
      }),
      status: 200,
    } as Response);

    render(
      <NodeFieldEditor
        fields={{ selectedTribeIds: [] }}
        nodeLabel="List of Tribe"
        nodeType="listTribe"
        onClose={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(await screen.findByRole("dialog", { name: "List of Tribe" })).toBeInTheDocument();
    expect(await screen.findByText("Pegasus Cartel")).toBeVisible();
    expect(screen.queryByText("Broken Tribe")).not.toBeInTheDocument();
    expect(screen.queryByText(/Unable to load options|Request failed/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("renders selected options with the orange-tinted boxed checkbox state", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 98_000_418, name: "Pegasus Cartel", nameShort: "PEG" },
        ],
      }),
      status: 200,
    } as Response);

    render(
      <NodeFieldEditor
        fields={{ selectedTribeIds: [98_000_418] }}
        nodeLabel="List of Tribe"
        nodeType="listTribe"
        onClose={() => undefined}
        onSave={() => undefined}
      />,
    );

    const checkbox = await screen.findByRole("checkbox");
    const selectedRow = checkbox.closest("label");

    expect(checkbox).toBeChecked();
    expect(selectedRow).toHaveClass("is-selected");
    expect(selectedRow?.querySelector(".ff-node-field-editor__checkbox-indicator")).not.toBeNull();
  });

  it("saves numeric selections in deterministic sorted order", async () => {
    const onSave = vi.fn();

    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 3, name: "Third Tribe", nameShort: "TRI" },
          { id: 1, name: "First Tribe", nameShort: "ONE" },
        ],
      }),
      status: 200,
    } as Response);

    render(
      <NodeFieldEditor
        fields={{ selectedTribeIds: [2] }}
        nodeLabel="List of Tribe"
        nodeType="listTribe"
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.click(await screen.findByRole("checkbox", { name: /Third Tribe/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /First Tribe/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ selectedTribeIds: [1, 2, 3] }));
  });

  it.each([
    ["listTribe", "selectedTribeIds", "tribes"],
    ["listShip", "selectedShipIds", "ships"],
  ])("preserves %s selections through failure, explicit retry and reopen", async (nodeType, key, collection) => {
    const onSave = vi.fn();
    const fetchSpy = vi.spyOn(window, "fetch").mockImplementationOnce((input) => {
      const url = input instanceof Request ? input.url : String(input);
      expect(url).toBe(`https://world-api-stillness.live.pub.evefrontier.com/v2/${collection}`);
      return Promise.reject(new TypeError("Failed to fetch"));
    }).mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 7, name: "Saved choice" }] })));
    const props = { fields: { [key]: [7] }, nodeLabel: "Remote list", nodeType, onClose: () => undefined, onSave };
    const view = render(<NodeFieldEditor {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("World API lookup failed");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ [key]: [7] }));
    fireEvent.click(screen.getByRole("button", { name: "Retry World API lookup" }));
    expect(await screen.findByRole("checkbox")).toBeChecked();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    view.unmount();
    render(<NodeFieldEditor {...props} fields={onSave.mock.calls[1][0] as import("../types/nodes").NodeFieldMap} />);
    expect(await screen.findByRole("checkbox")).toBeChecked();
  });

  it("ignores a stale response after switching collection", async () => {
    let resolveTribes!: (response: Response) => void;
    vi.spyOn(window, "fetch").mockImplementationOnce(() => new Promise((resolve) => { resolveTribes = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 8, name: "Ship" }] })));
    const props = { fields: {}, nodeLabel: "Remote list", onClose: () => undefined, onSave: () => undefined };
    const view = render(<NodeFieldEditor {...props} nodeType="listTribe" />);
    view.rerender(<NodeFieldEditor {...props} nodeType="listShip" />);
    expect(await screen.findByText("Ship")).toBeVisible();
    await act(async () => {
      resolveTribes(new Response(JSON.stringify({ data: [{ id: 7, name: "Stale tribe" }] })));
      await Promise.resolve();
    });
    expect(screen.queryByText("Stale tribe")).not.toBeInTheDocument();
    view.unmount();
  });

  it("shows a valid empty collection separately from failure", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    render(<NodeFieldEditor fields={{}} nodeLabel="List" nodeType="listShip" onClose={() => undefined} onSave={() => undefined} />);
    expect(await screen.findByText("No options available.")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders local behaviour options and saves them in deterministic sorted order", () => {
    const onSave = vi.fn();

    render(
      <NodeFieldEditor
        fields={{ selectedBehaviourCodes: [3] }}
        nodeLabel="Has Behaviour"
        nodeType="hasBehaviour"
        onClose={() => undefined}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Entered/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Started Attack/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ selectedBehaviourCodes: [1, 2, 3] }));
  });
});