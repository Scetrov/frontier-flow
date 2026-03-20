import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("event trigger generators", () => {
  it.each([
    ["aggression", "candidate.priority_weight"],
    ["proximity", "candidate.priority_weight"],
  ])("emits seeded bindings for %s", (nodeType, expectedPriority) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain("_target: &TargetCandidateArg");
    expect(output).toContain(`= ${expectedPriority};`);
    expect(context.entryFunctions[0]).toContain(nodeType);
    expect(context.bindings.size).toBe(2);
  });
});