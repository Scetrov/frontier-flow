import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("scoring modifier generators", () => {
  it.each(["behaviourBonus", "aggressorBonus", "damageBonus", "sizeTierBonus", "groupBonusLookup", "threatBonus", "historyPenalty"])(
    "emits a scoring fragment for %s",
    (nodeType) => {
      const generator = getGenerator(nodeType);
      const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), createGenerationContext("starter_contract")) ?? [];

      expect(lines.map((line) => line.code).join("\n")).toContain(nodeType);
    },
  );
});