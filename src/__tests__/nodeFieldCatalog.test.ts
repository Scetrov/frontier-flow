import { describe, expect, it } from "vitest";

import { getDefaultNodeFields } from "../data/nodeFieldCatalog";
import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";

describe("nodeFieldCatalog", () => {
  it("returns an empty field map for non-editable node types", () => {
    expect(getDefaultNodeFields("proximity")).toEqual({});
  });

  it("always provides a concrete fields map in flow node data", () => {
    const definition = getNodeDefinition("proximity");

    if (definition === undefined) {
      throw new Error("Expected proximity node definition to exist.");
    }

    expect(createFlowNodeData(definition).fields).toEqual({});
  });
});