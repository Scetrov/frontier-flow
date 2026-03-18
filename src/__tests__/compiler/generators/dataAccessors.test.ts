import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("data accessor generators", () => {
  it.each(["getTribe", "hpRatio", "shieldRatio", "armorRatio", "getGroupId", "getBehaviour", "isAggressor", "getPriorityWeight"])(
    "emits a code fragment for %s",
    (nodeType) => {
      const generator = getGenerator(nodeType);
      const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), createGenerationContext("starter_contract")) ?? [];

      expect(lines.map((line) => line.code).join("\n")).toContain(nodeType);
    },
  );
});