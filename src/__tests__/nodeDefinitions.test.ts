import { describe, expect, it } from "vitest";

import { authorableNodeDefinitions, nodeDefinitions } from "../data/node-definitions";

const retiredNodeTypes = ["excludeOwner", "excludeSameTribe", "excludeStoppedAttack", "excludeNpc"] as const;
const primitiveNodeTypes = [
  "isOwner",
  "isSameTribe",
  "hasStoppedAttack",
  "isNpc",
  "booleanNot",
  "booleanAnd",
  "booleanOr",
  "booleanXor",
] as const;

describe("nodeDefinitions", () => {
  it("contains the complete runtime catalogue and a filtered authoring catalogue", () => {
    expect(nodeDefinitions).toHaveLength(39);
    expect(authorableNodeDefinitions).toHaveLength(35);
    expect(authorableNodeDefinitions.map((definition) => definition.type)).not.toEqual(
      expect.arrayContaining([...retiredNodeTypes]),
    );
    expect(nodeDefinitions.map((definition) => definition.type)).toEqual(
      expect.arrayContaining([...primitiveNodeTypes, ...retiredNodeTypes]),
    );
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

  it("adds primitive predicate and boolean operator metadata", () => {
    expect(nodeDefinitions.find((definition) => definition.type === "isSameTribe")).toMatchObject({
      label: "Is Same Tribe",
      sockets: [
        { id: "tribe", direction: "input" },
        { id: "owner_tribe", direction: "input" },
        { id: "matches", direction: "output" },
      ],
    });
    expect(nodeDefinitions.find((definition) => definition.type === "booleanNot")).toMatchObject({
      label: "NOT",
      sockets: [
        { id: "input", direction: "input" },
        { id: "result", direction: "output" },
      ],
    });
    expect(nodeDefinitions.find((definition) => definition.type === "booleanOr")).toMatchObject({
      label: "OR",
      sockets: [
        { id: "left", direction: "input" },
        { id: "right", direction: "input" },
        { id: "result", direction: "output" },
      ],
    });
  });

  it("marks bundled exclusion nodes as retired with replacement guidance", () => {
    expect(nodeDefinitions.find((definition) => definition.type === "excludeOwner")?.deprecation).toEqual(
      expect.objectContaining({
        status: "retired",
        replacedBy: ["isOwner", "booleanNot"],
      }),
    );
    expect(nodeDefinitions.find((definition) => definition.type === "excludeSameTribe")?.deprecation).toEqual(
      expect.objectContaining({
        status: "retired",
        replacedBy: ["isSameTribe", "booleanNot", "booleanOr"],
      }),
    );
  });

  it("keeps the canonical primitive targeting flow sockets available", () => {
    const proximity = nodeDefinitions.find((definition) => definition.type === "proximity");
    const getTribe = nodeDefinitions.find((definition) => definition.type === "getTribe");
    const isSameTribe = nodeDefinitions.find((definition) => definition.type === "isSameTribe");
    const booleanNot = nodeDefinitions.find((definition) => definition.type === "booleanNot");
    const booleanOr = nodeDefinitions.find((definition) => definition.type === "booleanOr");
    const addToQueue = nodeDefinitions.find((definition) => definition.type === "addToQueue");

    expect(proximity?.sockets.map((socket) => socket.id)).toEqual(["priority", "target"]);
    expect(getTribe?.sockets.map((socket) => socket.id)).toEqual(["target", "tribe", "owner_tribe"]);
    expect(isSameTribe?.sockets.map((socket) => socket.id)).toEqual(["tribe", "owner_tribe", "matches"]);
    expect(booleanNot?.sockets.map((socket) => socket.id)).toEqual(["input", "result"]);
    expect(booleanOr?.sockets.map((socket) => socket.id)).toEqual(["left", "right", "result"]);
    expect(addToQueue?.sockets.map((socket) => socket.id)).toEqual([
      "priority_in",
      "predicate",
      "target",
      "weight",
      "priority_out",
    ]);
  });
});
