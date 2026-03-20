import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

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
});