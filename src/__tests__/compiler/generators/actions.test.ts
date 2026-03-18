import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("action generators", () => {
  it("emits a queue mutation expression", () => {
    const generator = getGenerator("addToQueue");
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode("add_to_queue_node", "addToQueue"), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain("if (");
    expect(output).toContain("priority_out");
    expect(context.bindings.size).toBe(1);
  });
});