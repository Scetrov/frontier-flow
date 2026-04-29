import { describe, expect, it } from "vitest";

import { getDefaultNodeFields, getNodeFieldSummary, normalizeNodeFields } from "../data/nodeFieldCatalog";
import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";

describe("nodeFieldCatalog", () => {
  it("returns an empty field map for non-editable node types", () => {
    expect(getDefaultNodeFields("enteredAttacked")).toEqual({});
  });

  it("provides default editable fields and summaries for configurable behaviour predicates", () => {
    expect(getDefaultNodeFields("hasBehaviour")).toEqual({ selectedBehaviourCodes: [] });
    expect(getNodeFieldSummary("hasBehaviour", { selectedBehaviourCodes: [1, 3] })).toEqual(["Entered, Stopped Attack"]);
  });

  it("always provides a concrete fields map in flow node data", () => {
    const definition = getNodeDefinition("enteredAttacked");

    if (definition === undefined) {
      throw new Error("Expected enteredAttacked node definition to exist.");
    }

    expect(createFlowNodeData(definition).fields).toEqual({});
  });

  it("normalizes add-to-queue weights to safe emitted u64-compatible integers", () => {
    expect(normalizeNodeFields("addToQueue", { weight: 0 })).toEqual({ weight: 100 });
    expect(normalizeNodeFields("addToQueue", { weight: -1 })).toEqual({ weight: 100 });
    expect(normalizeNodeFields("addToQueue", { weight: 1.5 })).toEqual({ weight: 1 });
    expect(normalizeNodeFields("addToQueue", { weight: 75 })).toEqual({ weight: 75 });
    expect(normalizeNodeFields("addToQueue", { weight: Number.MAX_SAFE_INTEGER + 1_000 })).toEqual({ weight: Number.MAX_SAFE_INTEGER });
    expect(normalizeNodeFields("addToQueue", {})).toEqual({});
  });
});