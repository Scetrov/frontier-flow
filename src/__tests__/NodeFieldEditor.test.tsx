import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NodeFieldEditor from "../components/NodeFieldEditor";
import type { EditableFieldDefinition, NodeFieldValueSet } from "../types/nodes";

const blockedTypeField: EditableFieldDefinition = {
  id: "blockedTypeIds",
  label: "Blocked Type IDs",
  valueType: "typeId",
  required: false,
  defaultValue: [],
  validationRules: {
    allowDuplicates: false,
  },
  editorKind: "list-editor",
};

const blockedTribeField: EditableFieldDefinition = {
  id: "blockedTribes",
  label: "Blocked Tribes",
  valueType: "tribe",
  required: false,
  defaultValue: [],
  validationRules: {
    allowDuplicates: false,
  },
  editorKind: "list-editor",
};

const initialValues: NodeFieldValueSet = {
  values: {
    blockedTypeIds: [60003760],
    blockedTribes: ["red-alliance"],
  },
};

describe("NodeFieldEditor", () => {
  it("adds, validates, and saves list-backed values", async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn<(valueSet: NodeFieldValueSet) => void>();

    render(
      <NodeFieldEditor
        fields={[blockedTypeField, blockedTribeField]}
        nodeLabel="Type Blocklist Config"
        onCancel={onCancel}
        onSave={onSave}
        valueSet={initialValues}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit fields for Type Blocklist Config" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Blocked Type IDs value" }));
    fireEvent.change(screen.getByLabelText("Blocked Type IDs value 2"), {
      target: { value: "60003761" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Blocked Type IDs value 2")).toHaveValue("60003761");
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Blocked Tribes value" }));
    fireEvent.change(screen.getByLabelText("Blocked Tribes value 2"), {
      target: { value: "blue-coalition" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Blocked Tribes value 2")).toHaveValue("blue-coalition");
    });

    fireEvent.click(screen.getByRole("button", { name: "Save node fields" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    const savedValue = onSave.mock.calls[0]?.[0] as NodeFieldValueSet | undefined;
    expect(savedValue).toBeDefined();
    expect(savedValue?.values).toEqual({
      blockedTypeIds: [60003760, 60003761],
      blockedTribes: ["red-alliance", "blue-coalition"],
    });
    expect(typeof savedValue?.lastEditedAt).toBe("string");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("shows validation feedback for blank list entries before save succeeds", () => {
    const onSave = vi.fn<(valueSet: NodeFieldValueSet) => void>();

    render(
      <NodeFieldEditor
        fields={[blockedTribeField]}
        nodeLabel="Threat Ledger Config"
        onCancel={() => undefined}
        onSave={onSave}
        valueSet={{ values: { blockedTribes: [] } }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Blocked Tribes value" }));
    fireEvent.click(screen.getByRole("button", { name: "Save node fields" }));

    expect(screen.getByText("Blocked Tribes item 1 cannot be blank.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Blocked Tribes value 1"), { target: { value: "pirate-clan" } });
    fireEvent.click(screen.getByRole("button", { name: "Save node fields" }));

    const savedValue = onSave.mock.calls[0]?.[0] as NodeFieldValueSet | undefined;

    expect(savedValue).toBeDefined();
    expect(savedValue?.values).toEqual({
      blockedTribes: ["pirate-clan"],
    });
    expect(typeof savedValue?.lastEditedAt).toBe("string");
  });
});