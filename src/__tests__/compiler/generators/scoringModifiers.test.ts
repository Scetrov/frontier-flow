import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("scoring modifier generators", () => {
  it.each([
    ["behaviourBonus", "BEHAVIOUR_STARTED_ATTACK"],
    ["aggressorBonus", "if ("],
    ["damageBonus", "100 -"],
    ["sizeTierBonus", "tier_for_group("],
  ])("emits a scoring fragment for %s", (nodeType, expectedFragment) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBe(1);
  });
});