import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("action generators", () => {
  it("emits queue mutation comments", () => {
    const generator = getGenerator("addToQueue");
    const lines = generator?.emit(createIrNode("add_to_queue_node", "addToQueue"), createGenerationContext("starter_contract")) ?? [];

    expect(lines.map((line) => line.code).join("\n")).toContain("addToQueue");
  });
});