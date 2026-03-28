import { describe, expect, it } from "vitest";

import { createTestFlowNode } from "../test/graphInteractionTestUtils";
import { createNamedFlowContract } from "../utils/contractStorage";
import { createPortableGraphDocument } from "../utils/graphDocument";
import { parseGraphYaml, serializeGraphYaml } from "../utils/graphYaml";

describe("graphYaml", () => {
  it("serializes a portable graph document with a deterministic filename", () => {
    const document = createPortableGraphDocument({
      appVersion: "1.2.3",
      contract: createNamedFlowContract("Raid Response ++", [createTestFlowNode("node_a", "aggression")], []),
      source: { channel: "yaml-export" },
    });

    const result = serializeGraphYaml({ document });

    expect(result.suggestedFileName).toBe("raid-response.frontier-flow.yaml");
    expect(result.content).toContain("kind: frontier-flow-graph");
    expect(result.content).toContain("name: Raid Response ++");
    expect(result.content).toContain("fields: {}");
    expect(result.content).not.toContain("label:");
    expect(result.content).not.toContain("sockets:");
  });

  it("throws on malformed YAML input", () => {
    expect(() => parseGraphYaml({ content: "kind: frontier-flow-graph\ngraph: [" })).toThrow();
  });
});