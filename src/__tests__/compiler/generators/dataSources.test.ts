import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("data source generators", () => {
  it.each(["groupBonusConfig", "roundRobinConfig", "threatLedgerConfig", "typeBlocklistConfig"])(
    "emits config scaffolding for %s",
    (nodeType) => {
      const generator = getGenerator(nodeType);
      const context = createGenerationContext("starter_contract");
      const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];

      expect(lines.map((line) => line.code).join("\n")).toContain(nodeType);
      expect(context.structs.join("\n")).toContain(nodeType);
    },
  );
});