import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("event trigger generators", () => {
  it.each(["aggression", "proximity"])("emits boilerplate for %s", (nodeType) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];

    expect(lines.map((line) => line.code).join("\n")).toContain(`event trigger ${nodeType}`);
    expect(context.entryFunctions[0]).toContain(nodeType);
  });
});