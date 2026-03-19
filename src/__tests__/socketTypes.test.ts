import { describe, expect, it } from "vitest";

import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";
import type { FlowNode } from "../types/nodes";
import { canConnectSocketTypes, getEdgeColor, getEdgeStrokeWidth, isValidFlowConnection } from "../utils/socketTypes";

function createNode(id: string, type: string): FlowNode {
  const definition = getNodeDefinition(type);

  if (definition === undefined) {
    throw new Error(`Missing node definition for ${type}`);
  }

  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: createFlowNodeData(definition),
  };
}

describe("socketTypes", () => {
  it("accepts valid target connections", () => {
    expect(canConnectSocketTypes("target", "target")).toBe(true);
  });

  it("rejects invalid number to tribe connections", () => {
    expect(canConnectSocketTypes("number", "tribe")).toBe(false);
  });

  it("allows typed values to flow into any inputs", () => {
    expect(canConnectSocketTypes("number", "any")).toBe(true);
  });

  it("validates a target-to-target canvas connection", () => {
    const nodes = [createNode("proximity", "proximity"), createNode("tribe", "getTribe")];

    expect(
      isValidFlowConnection(
        {
          source: "proximity",
          target: "tribe",
          sourceHandle: "target",
          targetHandle: "target",
        },
        nodes,
        [],
      ),
    ).toBe(true);
  });

  it("rejects a number-to-tribe canvas connection", () => {
    const nodes = [createNode("hp", "hpRatio"), createNode("tribe", "getTribe")];

    expect(
      isValidFlowConnection(
        {
          source: "hp",
          target: "tribe",
          sourceHandle: "hp_ratio",
          targetHandle: "tribe",
        },
        nodes,
        [],
      ),
    ).toBe(false);
  });

  it("accepts numeric output into the any input of Add to Queue", () => {
    const nodes = [createNode("group", "getGroupId"), createNode("queue", "addToQueue")];

    expect(
      isValidFlowConnection(
        {
          source: "group",
          target: "queue",
          sourceHandle: "group_id",
          targetHandle: "weight",
        },
        nodes,
        [],
      ),
    ).toBe(true);
  });

  it("derives edge styling from the source socket type", () => {
    const priorityNode = createNode("event", "aggression");
    const valueNode = createNode("source", "getGroupId");

    expect(getEdgeColor(priorityNode, "target")).toBe("var(--socket-entity)");
    expect(getEdgeStrokeWidth(priorityNode, "priority")).toBe(3);
    expect(getEdgeStrokeWidth(valueNode, "group_id")).toBe(2);
  });
});