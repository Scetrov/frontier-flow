import { describe, expect, it } from "vitest";

import { restoreSavedFlow } from "../components/restoreSavedFlow";
import { createFlowNodeData, getNodeDefinition, hydrateFlowNode } from "../data/node-definitions";
import type { FlowNode } from "../types/nodes";

function createNode(id: string, type: string, fieldValues?: FlowNode["data"]["fieldValues"]): FlowNode {
  const definition = getNodeDefinition(type);

  if (definition === undefined) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: {
      ...createFlowNodeData(definition),
      fieldValues,
    },
  };
}

describe("node field persistence", () => {
  it("hydrates valid persisted editable field values from saved nodes", () => {
    const hydrated = hydrateFlowNode(
      createNode("blocklist", "typeBlocklistConfig", {
        values: {
          blockedTypeIds: [60003760, 60003761],
          blockedTribes: ["red-alliance", "blue-coalition"],
        },
        lastEditedAt: "2026-03-19T00:00:00.000Z",
      }),
    );

    expect(hydrated?.data.fieldValues).toEqual({
      values: {
        blockedTypeIds: [60003760, 60003761],
        blockedTribes: ["red-alliance", "blue-coalition"],
      },
      lastEditedAt: "2026-03-19T00:00:00.000Z",
    });
  });

  it("drops unknown or invalid persisted field values during hydration", () => {
    const hydrated = hydrateFlowNode({
      ...createNode("blocklist", "typeBlocklistConfig"),
      data: {
        ...createNode("blocklist", "typeBlocklistConfig").data,
        fieldValues: {
          values: {
            blockedTypeIds: [60003760, "not-a-number"],
            blockedTribes: ["red-alliance"],
            unsupported: ["ignored"],
          },
        },
      },
    });

    expect(hydrated?.data.fieldValues).toEqual({
      values: {
        blockedTypeIds: [],
        blockedTribes: ["red-alliance"],
      },
      lastEditedAt: undefined,
    });
  });

  it("preserves editable field values through restore and save/load hydration", () => {
    const restored = restoreSavedFlow([
      createNode("blocklist", "typeBlocklistConfig", {
        values: {
          blockedTypeIds: [700001, 700002],
          blockedTribes: ["pirate-clan"],
        },
      }),
    ], []);

    expect(restored.remediationNotices).toEqual([]);
    expect(restored.nodes[0]?.data.fieldValues).toEqual({
      values: {
        blockedTypeIds: [700001, 700002],
        blockedTribes: ["pirate-clan"],
      },
      lastEditedAt: undefined,
    });
  });
});