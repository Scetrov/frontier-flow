import { describe, expect, it } from "vitest";

import { nodeDefinitions } from "../data/node-definitions";

describe("nodeDefinitions", () => {
  it("contains the 9 verified canvas nodes", () => {
    expect(nodeDefinitions).toHaveLength(9);
    expect(nodeDefinitions.map((definition) => definition.label)).toEqual([
      "Aggression",
      "Proximity",
      "Get Tribe",
      "List of Tribe",
      "Is In List",
      "Add to Queue",
      "HP Ratio",
      "Shield Ratio",
      "Armor Ratio",
    ]);
  });

  it("declares unique node and socket ids with socket metadata", () => {
    const nodeTypes = new Set<string>();

    for (const definition of nodeDefinitions) {
      expect(nodeTypes.has(definition.type)).toBe(false);
      nodeTypes.add(definition.type);
      expect(definition.sockets.length).toBeGreaterThan(0);

      const socketIds = new Set<string>();
      for (const socket of definition.sockets) {
        expect(socketIds.has(socket.id)).toBe(false);
        socketIds.add(socket.id);
        expect(socket.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the canonical targeting flow sockets available", () => {
    const proximity = nodeDefinitions.find((definition) => definition.type === "proximity");
    const getTribe = nodeDefinitions.find((definition) => definition.type === "getTribe");
    const listOfTribe = nodeDefinitions.find((definition) => definition.type === "listOfTribe");
    const isInList = nodeDefinitions.find((definition) => definition.type === "isInList");
    const addToQueue = nodeDefinitions.find((definition) => definition.type === "addToQueue");

    expect(proximity?.sockets.map((socket) => socket.id)).toEqual(["priority", "target"]);
    expect(getTribe?.sockets.map((socket) => socket.id)).toContain("tribe");
    expect(listOfTribe?.sockets.map((socket) => socket.id)).toEqual(["items"]);
    expect(isInList?.sockets.map((socket) => socket.id)).toEqual(["input_item", "input_list", "yes", "no"]);
    expect(addToQueue?.sockets.map((socket) => socket.id)).toEqual([
      "priority_in",
      "predicate",
      "entity",
      "priority_out",
    ]);
  });
});