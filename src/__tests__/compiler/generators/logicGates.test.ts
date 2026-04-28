import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

import type { IRGraph } from "../../../compiler/types";

const emptyGraph: IRGraph = {
  nodes: new Map(),
  connections: [],
  executionOrder: [],
  moduleName: "starter_contract",
  requestedModuleName: "starter_contract",
  disconnectedNodeIds: [],
  unresolvedNodeIds: [],
};

describe("logic gate generators", () => {
  it.each([
    ["excludeOwner", ".character_id != owner_character_id", 1],
    ["excludeSameTribe", "||", 1],
    ["excludeStoppedAttack", "!= BEHAVIOUR_STOPPED_ATTACK", 1],
    ["excludeNpc", ".character_id != 0", 1],
  ])("emits a predicate fragment for %s", (nodeType, expectedFragment, expectedBindings) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBe(expectedBindings);
  });

  it("rejects Has Behaviour when no behaviour codes are selected", () => {
    const generator = getGenerator("hasBehaviour");
    const result = generator?.validate(createIrNode("has_behaviour_node", "hasBehaviour"), emptyGraph);

    expect(result).toEqual(
      expect.objectContaining({
        valid: false,
        diagnostics: [expect.objectContaining({ userMessage: "Select at least one behaviour before compiling Has Behaviour." })],
      }),
    );
  });

  it("emits a disjunction for the configured Has Behaviour codes", () => {
    const generator = getGenerator("hasBehaviour");
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode("has_behaviour_node", "hasBehaviour", { selectedBehaviourCodes: [1, 3] }), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("== BEHAVIOUR_ENTERED ||");
    expect(output).toContain("== BEHAVIOUR_STOPPED_ATTACK");
    expect(context.bindings.size).toBe(1);
  });
});