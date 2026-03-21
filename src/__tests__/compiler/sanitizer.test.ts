import { describe, expect, it } from "vitest";

import { collectSanitizationDiagnostics, sanitizeGraph, sanitizeIdentifier } from "../../compiler/sanitizer";
import { buildIrGraph } from "../../compiler/irBuilder";
import { createDefaultContractFlow } from "../../data/kitchenSinkFlow";

describe("sanitizer", () => {
  it("normalises identifiers to Move-safe tokens", () => {
    expect(sanitizeIdentifier("  Danger Zone!! ")).toBe("danger_zone");
    expect(sanitizeIdentifier("123 bad")).toBe("id_123_bad");
  });

  it("sanitizes the graph module name", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "Starter Contract!!!");

    expect(sanitizeGraph(graph).moduleName).toBe("starter_contract");
  });

  it("reports module names that cannot become valid identifiers", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "!!!");

    const diagnostics = collectSanitizationDiagnostics(graph);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.stage).toBe("sanitization");
    expect(diagnostics[0]?.reactFlowNodeId).toBeNull();
    expect(diagnostics[0]?.userMessage).toContain("Module name");
  });

  it("reports node labels that collapse to an empty identifier", () => {
    const flow = createDefaultContractFlow();
    const graph = buildIrGraph(flow.nodes, flow.edges, "starter_contract");
    const aggressionNode = graph.nodes.get("default_aggression");
    if (aggressionNode === undefined) {
      throw new Error("Expected default_aggression to exist.");
    }

    const invalidGraph = {
      ...graph,
      nodes: new Map(graph.nodes).set("default_aggression", {
        ...aggressionNode,
        label: "!!!",
      }),
    };

    const diagnostics = collectSanitizationDiagnostics(invalidGraph);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.stage).toBe("sanitization");
    expect(diagnostics[0]?.reactFlowNodeId).toBe("default_aggression");
    expect(diagnostics[0]?.userMessage).toContain("Node label");
  });

  describe("sanitizeIdentifier edge cases", () => {
    it("strips Move code injection attempts", () => {
      expect(sanitizeIdentifier('"); abort 0; //')).toBe("abort_0");
    });

    it("strips HTML/script injection", () => {
      expect(sanitizeIdentifier("<script>alert(1)</script>")).toBe("script_alert_1_script");
    });

    it("strips unicode homoglyphs to ASCII residue", () => {
      // Cyrillic 'а' (U+0430) is non-ASCII and gets stripped
      expect(sanitizeIdentifier("аdmin")).toBe("dmin");
    });

    it("strips emoji and preserves trailing ASCII", () => {
      expect(sanitizeIdentifier("🚀rocket")).toBe("rocket");
    });

    it("falls back for emoji-only input", () => {
      expect(sanitizeIdentifier("🔥💯")).toBe("generated_identifier");
    });

    it("uses a custom fallback when all chars are stripped", () => {
      expect(sanitizeIdentifier("🔥💯", "custom_fallback")).toBe("custom_fallback");
    });

    it("handles empty string", () => {
      expect(sanitizeIdentifier("")).toBe("generated_identifier");
    });

    it("handles whitespace-only input", () => {
      expect(sanitizeIdentifier("   \t\n  ")).toBe("generated_identifier");
    });

    it("collapses consecutive special characters", () => {
      expect(sanitizeIdentifier("a---b___c...d")).toBe("a_b_c_d");
    });

    it("strips control characters", () => {
      expect(sanitizeIdentifier("hello\x00world\x1F")).toBe("hello_world");
    });

    it("prefixes leading-digit identifiers", () => {
      expect(sanitizeIdentifier("42nodes")).toBe("id_42nodes");
    });

    it("handles single valid character", () => {
      expect(sanitizeIdentifier("x")).toBe("x");
    });

    it("preserves underscores between words", () => {
      expect(sanitizeIdentifier("my_module_name")).toBe("my_module_name");
    });

    it("lowercases mixed-case input", () => {
      expect(sanitizeIdentifier("MyModuleName")).toBe("mymodulename");
    });

    it("strips surrounding special chars cleanly", () => {
      expect(sanitizeIdentifier("***valid***")).toBe("valid");
    });
  });
});