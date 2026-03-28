import { describe, expect, it } from "vitest";

import { createTestFlowEdge, createTestFlowNode } from "../test/graphInteractionTestUtils";
import { createNamedFlowContract } from "../utils/contractStorage";
import {
  PortableGraphParseError,
  PortableGraphValidationError,
  createPortableGraphDocument,
  parsePortableGraphDocument,
} from "../utils/graphDocument";
import { serializeGraphYaml } from "../utils/graphYaml";

describe("graphDocument", () => {
  it("round-trips a portable graph document from YAML", () => {
    const node = createTestFlowNode("node_a", "aggression", {
      position: { x: 48, y: 96 },
    });
    const edge = createTestFlowEdge("edge_a", "node_a", "node_a", {
      sourceHandle: "source:any",
      targetHandle: "target:any",
    });
    const contract = createNamedFlowContract("Raid Response", [node], [edge], {
      description: "Imported contract",
      updatedAt: "2026-03-23T12:00:00.000Z",
    });
    const document = createPortableGraphDocument({
      appVersion: "1.2.3",
      contract,
      source: { channel: "yaml-export" },
    });

    const parsed = parsePortableGraphDocument({
      rawContent: serializeGraphYaml({ document }).content,
      sourceLabel: "raid-response.frontier-flow.yaml",
    });

    expect(parsed.document.contract.name).toBe("Raid Response");
    expect(parsed.document.graph.summary).toEqual({ edgeCount: 1, nodeCount: 1 });
    expect(parsed.document.graph.nodes).toEqual([
      {
        id: "node_a",
        type: "aggression",
        position: { x: 48, y: 96 },
        data: {
          fields: {},
        },
      },
    ]);
    expect(parsed.importedContract.description).toBe("Imported contract");
    expect(parsed.importedContract.name).toBe("Raid Response");

    const importedNode = parsed.importedContract.nodes.at(0);
    if (importedNode === undefined) {
      throw new Error("Expected imported contract to contain the round-tripped node.");
    }

    expect(importedNode.id).toBe("node_a");
    expect(typeof importedNode.data.label).toBe("string");
    expect(Array.isArray(importedNode.data.sockets)).toBe(true);
  });

  it("rejects unsupported document versions", () => {
    expect(() => parsePortableGraphDocument({
      rawContent: [
        "version: 2",
        "kind: frontier-flow-graph",
        "exportedAt: 2026-03-23T12:00:00.000Z",
        "appVersion: 1.2.3",
        "contract:",
        "  name: Raid Response",
        "  updatedAt: 2026-03-23T12:00:00.000Z",
        "  source:",
        "    channel: yaml-export",
        "graph:",
        "  nodes: []",
        "  edges: []",
        "  summary:",
        "    nodeCount: 0",
        "    edgeCount: 0",
      ].join("\n"),
      sourceLabel: "invalid-version.yaml",
    })).toThrow(PortableGraphParseError);
  });

  it("rejects edges that point to missing nodes", () => {
    expect(() => parsePortableGraphDocument({
      rawContent: [
        "version: 1",
        "kind: frontier-flow-graph",
        "exportedAt: 2026-03-23T12:00:00.000Z",
        "appVersion: 1.2.3",
        "contract:",
        "  name: Raid Response",
        "  updatedAt: 2026-03-23T12:00:00.000Z",
        "  source:",
        "    channel: yaml-export",
        "graph:",
        "  nodes:",
        "    - id: node_a",
        "      type: aggression",
        "      position:",
        "        x: 0",
        "        y: 0",
        "      data:",
        "        fields: {}",
        "  edges:",
        "    - id: edge_a",
        "      source: node_a",
        "      target: missing_node",
        "  summary:",
        "    nodeCount: 1",
        "    edgeCount: 1",
      ].join("\n"),
      sourceLabel: "dangling-edge.yaml",
    })).toThrow(PortableGraphValidationError);
  });

  it("rejects graph summaries that do not match exported content", () => {
    expect(() => parsePortableGraphDocument({
      rawContent: [
        "version: 1",
        "kind: frontier-flow-graph",
        "exportedAt: 2026-03-23T12:00:00.000Z",
        "appVersion: 1.2.3",
        "contract:",
        "  name: Raid Response",
        "  updatedAt: 2026-03-23T12:00:00.000Z",
        "  source:",
        "    channel: yaml-export",
        "graph:",
        "  nodes: []",
        "  edges: []",
        "  summary:",
        "    nodeCount: 1",
        "    edgeCount: 0",
      ].join("\n"),
      sourceLabel: "invalid-summary.yaml",
    })).toThrow(PortableGraphValidationError);
  });
});