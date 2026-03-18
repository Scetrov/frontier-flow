import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("data source generators", () => {
  it.each([
    ["groupBonusConfig", "default_bonus"],
    ["roundRobinConfig", "repeat_window"],
    ["threatLedgerConfig", "tribe_bonus"],
    ["typeBlocklistConfig", "blocked_type"],
  ])("emits config scaffolding for %s", (nodeType, expectedStructField) => {
      const generator = getGenerator(nodeType);
      const context = createGenerationContext("starter_contract");
      const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
      const output = lines.map((line) => line.code).join("\n");

      expect(output).toContain("let ");
      expect(output).toContain("config");
      expect(context.structs.join("\n")).toContain(expectedStructField);
      expect(context.bindings.size).toBe(1);
    });
});