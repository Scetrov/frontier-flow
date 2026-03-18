import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("logic gate generators", () => {
  it.each([
    ["excludeOwner", "!= 1", 1],
    ["excludeSameTribe", "||", 1],
    ["excludeStoppedAttack", "!= 0", 1],
    ["excludeNpc", ">= 100", 1],
    ["isInList", "!", 2],
    ["countAggressors", ">= 5", 2],
  ])("emits a predicate fragment for %s", (nodeType, expectedFragment, expectedBindings) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBe(expectedBindings);
  });
});