import { describe, expect, it } from "vitest";

import { getDefaultNodeFields, getNodeFieldSummary } from "../data/nodeFieldCatalog";
import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";

describe("nodeFieldCatalog", () => {
  it("returns an empty field map for non-editable node types", () => {
    expect(getDefaultNodeFields("proximity")).toEqual({});
  });

  it("provides default editable fields and summaries for configurable behaviour predicates", () => {
    expect(getDefaultNodeFields("hasBehaviour")).toEqual({ selectedBehaviourCodes: [] });
    expect(getNodeFieldSummary("hasBehaviour", { selectedBehaviourCodes: [1, 3] })).toEqual(["Entered, Stopped Attack"]);
  });

  it("always provides a concrete fields map in flow node data", () => {
    const definition = getNodeDefinition("proximity");

    if (definition === undefined) {
      throw new Error("Expected proximity node definition to exist.");
    }

    expect(createFlowNodeData(definition).fields).toEqual({});
  });
});