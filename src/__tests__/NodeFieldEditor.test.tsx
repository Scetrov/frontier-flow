import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});