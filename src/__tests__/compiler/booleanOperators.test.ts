import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../compiler/generators";
import { createIrNode } from "./helpers";

describe("primitive boolean operator generators", () => {
  it.each([
    ["isSameTribe", "==", 1],
    ["isOwner", "== 1", 1],
    ["hasStoppedAttack", "== 0", 1],
    ["isNpc", "< 100", 1],
    ["booleanNot", "!", 1],
    ["booleanAnd", "&&", 1],
    ["booleanOr", "||", 1],
    ["booleanXor", "!=" , 1],
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