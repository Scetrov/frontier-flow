import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("data accessor generators", () => {
  it.each([
    ["getTribe", "% 7"],
    ["hpRatio", "100 -"],
    ["shieldRatio", "% 30"],
    ["armorRatio", "% 20"],
    ["getGroupId", "% 16"],
    ["getBehaviour", "% 4"],
    ["isAggressor", "== 0"],
    ["getPriorityWeight", "% 90"],
  ])("emits a code fragment for %s", (nodeType, expectedFragment) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBeGreaterThan(0);
  });
});