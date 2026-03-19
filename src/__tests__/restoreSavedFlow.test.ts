import { describe, expect, it, vi } from "vitest";

import { restoreSavedFlow } from "../components/restoreSavedFlow";
import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";
import type { FlowNode } from "../types/nodes";

function createNode(id: string, type: string): FlowNode {
  const definition = getNodeDefinition(type);

  if (definition === undefined) {
    return {
      id,
      type,
      position: { x: 0, y: 0 },
      data: {
        type,
        label: "Legacy",
        description: "Legacy node",
        color: "var(--socket-any)",
        category: "logic-gate",
        sockets: [],
      },
    };
  }

  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: createFlowNodeData(definition),
  };
}

describe("restoreSavedFlow", () => {
  it("surfaces remediation notices for unknown legacy nodes", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const restoredFlow = restoreSavedFlow([createNode("known", "aggression"), createNode("legacy", "obsoleteNode")], []);

    expect(restoredFlow.nodes).toHaveLength(1);
    expect(restoredFlow.nodes[0]?.type).toBe("aggression");
    expect(restoredFlow.remediationNotices).toEqual([
      expect.objectContaining({
        nodeId: "legacy",
        legacyType: "obsoleteNode",
        severity: "warning",
      }),
    ]);
    expect(warnSpy).toHaveBeenCalledWith("Omitting unknown saved node type: obsoleteNode");

    warnSpy.mockRestore();
  });

  it("drops edges connected to omitted legacy nodes after restore", () => {
    const restoredFlow = restoreSavedFlow(
      [createNode("known", "aggression"), createNode("legacy", "obsoleteNode")],
      [
        {
          id: "legacy-edge",
          source: "known",
          sourceHandle: "target",
          target: "legacy",
          targetHandle: "config",
        },
      ],
    );

    expect(restoredFlow.edges).toHaveLength(0);
  });

  it("migrates excludeSameTribe into primitive boolean nodes", () => {
    const restoredFlow = restoreSavedFlow(
      [
        createNode("trigger", "aggression"),
        createNode("tribe", "getTribe"),
        createNode("aggressor", "isAggressor"),
        createNode("legacy_same_tribe", "excludeSameTribe"),
        createNode("queue", "addToQueue"),
      ],
      [
        { id: "edge_tribe", source: "tribe", sourceHandle: "tribe", target: "legacy_same_tribe", targetHandle: "tribe" },
        {
          id: "edge_owner_tribe",
          source: "tribe",
          sourceHandle: "owner_tribe",
          target: "legacy_same_tribe",
          targetHandle: "owner_tribe",
        },
        {
          id: "edge_aggressor",
          source: "aggressor",
          sourceHandle: "is_aggressor",
          target: "legacy_same_tribe",
          targetHandle: "is_aggressor",
        },
        {
          id: "edge_predicate",
          source: "legacy_same_tribe",
          sourceHandle: "include",
          target: "queue",
          targetHandle: "predicate",
        },
      ],
    );

    expect(restoredFlow.nodes.map((node) => node.type)).toEqual(
      expect.arrayContaining(["isSameTribe", "booleanNot", "booleanOr"]),
    );
    expect(restoredFlow.nodes.map((node) => node.type)).not.toContain("excludeSameTribe");
    expect(restoredFlow.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceHandle: "matches", targetHandle: "input" }),
        expect.objectContaining({ sourceHandle: "result", targetHandle: "left" }),
        expect.objectContaining({ sourceHandle: "result", targetHandle: "predicate" }),
      ]),
    );
    expect(restoredFlow.remediationNotices).toHaveLength(0);
  });

  it("rehydrates known saved nodes even when their persisted data payload is missing", () => {
    const restoredFlow = restoreSavedFlow(
      [
        {
          id: "sparse",
          type: "proximity",
          position: { x: 0, y: 0 },
          data: undefined as never,
        },
      ],
      [],
    );

    expect(restoredFlow.nodes).toHaveLength(1);
    expect(restoredFlow.nodes[0]?.type).toBe("proximity");
    expect(restoredFlow.nodes[0]?.data.sockets.map((socket) => socket.id)).toEqual(["priority", "target"]);
    expect(restoredFlow.remediationNotices).toHaveLength(0);
  });
});